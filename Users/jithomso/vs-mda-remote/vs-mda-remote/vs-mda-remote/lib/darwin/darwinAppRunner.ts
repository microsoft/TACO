/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import child_process = require('child_process');
import fs = require('fs');
import net = require('net');
import pl = require('plist-with-patches');
import Q = require('q');

import bi = require('../buildInfo');

var proxyInstance: child_process.ChildProcess = null;

var promiseExec = Q.denodeify(child_process.exec);

module AppRunner {
    export function startDebugProxy(proxyPort: number): Q.Promise<child_process.ChildProcess> {
        if (proxyInstance !== null) {
            proxyInstance.kill('SIGHUP'); // idevicedebugserver does not exit from SIGTERM
            proxyInstance = null;
        }

        return mountDeveloperImage().then(function () {
            proxyInstance = child_process.spawn('idevicedebugserverproxy', [proxyPort.toString()]);
            return proxyInstance;
        });
    }

    // Attempt to start the app on the device, using the debug server proxy on a given port.
    // Returns a socket speaking remote gdb protocol with the debug server proxy.
    export function startApp(packageId: string, proxyPort: number): Q.Promise<{}> {
        // When a user has many apps installed on their device, the response from ideviceinstaller may be large (500k or more)
        // This exceeds the maximum stdout size that exec allows, so we redirect to a temp file.
        return promiseExec('ideviceinstaller -l -o xml > /tmp/$$.ideviceinstaller && echo /tmp/$$.ideviceinstaller').then<string>(function (args) {
            // First find the path of the app on the device
            var filename = args[0].trim();
            if (! /^\/tmp\/[0-9]+\.ideviceinstaller$/.test(filename)) {
                throw new Error("WrongInstalledAppsFile");
            }
            var list: any[] = pl.parseFileSync(filename);
            fs.unlink(filename);
            for (var i = 0; i < list.length; ++i) {
                if (list[i].CFBundleIdentifier == packageId) {
                    var path: string = list[i].Path;
                    return path;
                }
            }
            throw new Error("PackageNotInstalled");
        }).then(function (path: string) { return startAppViaDebugger(proxyPort, path) });
    }

    function mountDeveloperImage(): Q.Promise<{}> {
        return getDiskImage()
            .then(function (path) {
                var imagemounter = child_process.spawn('ideviceimagemounter', [path]);
                var deferred = Q.defer();
                var stdout = ''
                imagemounter.stdout.on('data', function (data: any) {
                    stdout += data.toString();
                });
                imagemounter.on('close', function (code) {
                    if (code !== 0) {
                        if (stdout.indexOf("Error:") !== -1) {
                            deferred.resolve({}); // Technically failed, but likely caused by the image already being mounted.
                        } else if (stdout.indexOf('No device found, is it plugged in?') !== -1) {
                            deferred.reject('NoDeviceAttached');
                        }
                        deferred.reject('ErrorMountingDiskImage')
                    } else {
                        deferred.resolve({});
                    }
                });
                return deferred.promise;
            });
    }

    function getDiskImage(): Q.Promise<string> {
        // Attempt to find the OS version of the iDevice, e.g. 7.1
        var versionInfo = promiseExec("ideviceinfo -s -k ProductVersion").spread<string>(function (stdout: string, stderr: string) {
            return stdout.trim().substring(0, 3); // Versions for DeveloperDiskImage seem to be X.Y, while some device versions are X.Y.Z
            // NOTE: This will almost certainly be wrong in the next few years, once we hit version 10.0 
        }, function (err) {
                throw new Error("FailedGetDeviceInfo");
            });

        // Attempt to find the path where developer resources exist.
        var pathInfo = promiseExec("xcrun -sdk iphoneos --show-sdk-platform-path").spread<string>(function (stdout: string, stderr: string) {
            var sdkpath = stdout.trim();
            return sdkpath;
        });

        // Attempt to find the developer disk image for the appropriate 
        return Q.all([versionInfo, pathInfo]).spread<string>(function (version: string, sdkpath: string) {
            var find = child_process.spawn('find', [sdkpath, '-path', '*' + version + '*', '-name', 'DeveloperDiskImage.dmg']);
            var deferred = Q.defer<string>();

            find.stdout.on('data', function (data: any) {
                var dataStr: string = data.toString();
                var path = dataStr.split("\n")[0].trim()
                if (!path) {
                    deferred.reject('FailedFindDeveloperDiskImage');
                } else {
                    deferred.resolve(path);
                }
            });
            find.on('close', function (code) {
                deferred.reject('FailedFindDeveloperDiskImage');
            });

            return deferred.promise;
        })
    }

    function startAppViaDebugger(portNumber: number, packagePath: string) : Q.Promise<net.Socket>{
        var encodedPath = encodePath(packagePath);

        // We need to send 3 messages to the proxy, waiting for responses between each message:

        // A(length of encoded path),0,(encoded path)
        // Hc0
        // c

        // We expect a '+' for each message sent, followed by a $OK#9a to indicate that everything has worked.

        // For more info, see http://www.opensource.apple.com/source/lldb/lldb-167.2/docs/lldb-gdb-remote.txt

        var socket = new net.Socket();
        var initState = 0;
        var endStatus = null;
        var endSignal = null;

        var deferred1 = Q.defer<net.Socket>();
        var deferred2 = Q.defer<net.Socket>();
        var deferred3 = Q.defer<net.Socket>();

        socket.on("data", function (data) {
            data = data.toString();
            while (data[0] === '+') { data = data.substring(1); }
            // Acknowledge any packets sent our way
            if (data[0] == '$') {
                socket.write('+');
                if (data[1] === 'W') {
                    // The app process has exited, with hex status given by data[2-3] 
                    var status = parseInt(data.substring(2, 4), 16)
                    endStatus = status;
                    socket.end();
                } else if (data[1] === 'X') {
                    // The app rocess exited because of signal given by data[2-3]
                    var signal = parseInt(data.substring(2, 4), 16)
                    endSignal = signal;
                    socket.end();
                } else if (data.substring(1, 3) === 'OK') {
                    // last command was received OK;
                    if (initState === 1) {
                        deferred1.resolve(socket);
                    } else if (initState === 2) {
                        deferred2.resolve(socket);
                    }
                } else if (data[1] === 'O') {
                    // STDOUT was written to, and the rest of the input until reaching a '#' is a hex-encoded string of that output
                    if (initState === 3) {
                        deferred3.resolve(socket);
                        initState++;
                    }
                } else if (data[1] === 'E') {
                    // An error has occurred, with error code given by data[2-3]
                    deferred1.reject("Launch failed: " + parseInt(data.substring(2, 4), 16));
                    deferred2.reject("Launch failed: " + parseInt(data.substring(2, 4), 16));
                    deferred3.reject("Launch failed: " + parseInt(data.substring(2, 4), 16));
                }

            }
        });

        socket.on("end", function () {
            deferred1.reject("UnableToLaunchApp");
            deferred2.reject("UnableToLaunchApp");
            deferred3.reject("UnableToLaunchApp");
        });

        socket.connect(portNumber, "localhost", function () {
            // set argument 0 to the (encoded) path of the app
            var cmd = makeGdbCommand("A" + encodedPath.length + ",0," + encodedPath);
            initState++;
            socket.write(cmd);
            setTimeout(function () {
                if (initState == 1) {
                    deferred1.reject("DeviceLaunchTimeout");
                    deferred2.reject("DeviceLaunchTimeout");
                    deferred3.reject("DeviceLaunchTimeout");
                    socket.end();
                }
            }, 5000);
        });

        return deferred1.promise.then(function (sock: net.Socket) {
            // Set the step and continue thread to any thread
            var cmd = makeGdbCommand("Hc0");
            initState++;
            sock.write(cmd);
            setTimeout(function () {
                if (initState === 2) {
                    deferred2.reject("DeviceLaunchTimeout");
                    deferred3.reject("DeviceLaunchTimeout");
                    socket.end();
                }
            }, 5000);
            return deferred2.promise;
        }).then(function (sock: net.Socket) {
                //Continue execution; actually start the app running.
                var cmd = makeGdbCommand("c");
                initState++;
                sock.write(cmd);
                setTimeout(function () {
                    if (initState === 3) {
                        deferred3.reject("DeviceLaunchTimeout");
                        socket.end();
                    }
                }, 5000);
                return deferred3.promise;
            });
    }

    function encodePath(packagePath: string) : string {
        // Encode the path by converting each character value to hex
        var encodedPath = "";
        for (var i = 0; i < packagePath.length; ++i) {
            var c = packagePath[i];
            encodedPath += charToHex(c);
        }
        return encodedPath;
    }

    function charToHex(char: string) : string{
        var conversionTable = '0123456789ABCDEF';
        var charCode = char.charCodeAt(0);
        return conversionTable[(charCode & 0xF0) >> 4] + conversionTable[charCode & 0x0F];
    }

    function makeGdbCommand(command: string) : string {
        var commandString = "$" + command + "#";
        var stringSum = 0;
        for (var i = 0; i < command.length; i++) {
            stringSum += command.charCodeAt(i);
        }
        stringSum = stringSum & 0xFF;
        var checksum = stringSum.toString(16).toUpperCase();
        if (checksum.length < 2) {
            checksum = '0' + checksum;
        }
        commandString += checksum;
        return commandString;
    }
}

export = AppRunner;