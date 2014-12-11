/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import child_process = require('child_process');
import express = require('express');
import fs = require('fs');
import nconf = require('nconf');
import path = require('path');
import Q = require('q');
import readline = require('readline');
import packer = require('zip-stream');

import bi = require('../buildInfo');
import BuildLogger = require('../buildLogger');
import buildManager = require('../buildManager');
import CordovaConfig = require('../cordovaConfig');
import appRunner = require('./darwinAppRunner');
import certs = require('./darwinCerts');
import OSSpecifics = require('../OSSpecifics');
import resources = require('../resources');
import util = require('../util');

/// <reference path="../Scripts/typings/Q/Q-extensions.d.ts"/>

var allowsEmulate: boolean;
var nativeDebugProxyPort: number;
var webDebugProxyDevicePort: number;
var webDebugProxyPortMin: number;
var webDebugProxyPortMax: number;

var webProxyInstance: child_process.ChildProcess = null;

class DarwinSpecifics implements OSSpecifics.IOsSpecifics {
    defaults(base: any): any {
        var osxdefaults = {
            'serverDir': path.join(process.env.HOME, 'remote-builds'),
            'allowsEmulate': true,
            'nativeDebugProxyPort': 3001,
            'webDebugProxyDevicePort': 9221,
            'webDebugProxyRangeMin': 9222,
            'webDebugProxyRangeMax': 9322,
            'writePidToFile': false,
            'lang': process.env.LANG && process.env.LANG.replace(/_.*/, "") || "en", // Convert "en_US.UTF8" to "en", similarly for other locales
            'suppressVisualStudioMessage': false,
        };
        for (var key in osxdefaults) {
            if (!(key in base)) {
                base[key] = osxdefaults[key];
            }
        }
        return base;
    }

    // TODO: acquire ios-sim and any other ios-specific dependencies at this point as well rather than listing it as a dependency
    initialize(): Q.Promise<any> {
        if (process.getuid() === 0) {
            console.warn(resources.getString(nconf.get("lang"), "NotRunAsRoot"));
            process.exit(1);
        }
        var firstRunPath = path.join(process.env.HOME, ".vs-mda-remote")
        var isFirstRun = !fs.existsSync(firstRunPath);
        var deferred = Q.defer();
        if (isFirstRun) {
            console.info(resources.getString(nconf.get("lang"), "FirstRunDependencyConfiguration"));
            var readlineInterface = readline.createInterface({ input: process.stdin, output: process.stdout });
            var deferred2 = Q.defer<boolean>();
            readlineInterface.question(resources.getString(nconf.get("lang"), "HomebrewInstallationQuery"), function (response: string) {
                var shouldInstall = response === "" || response.trim().toLowerCase().indexOf(resources.getString(nconf.get("lang"), "HomebrewInstallationQueryResponse")) === 0;

                if (shouldInstall) {
                    var homebrewInstalled = Q.defer();
                    // We use spawn here rather than exec primarily so we can allow for user-interaction
                    var curlInstaller = child_process.spawn('curl', ['-fsSL', 'https://raw.githubusercontent.com/Homebrew/install/master/install']);
                    var installHomebrew = child_process.spawn('ruby', ['-']);

                    curlInstaller.stdout.on('data', function (data) {
                        installHomebrew.stdin.write(data);
                    });
                    curlInstaller.on('close', function (code) {
                        installHomebrew.stdin.end();
                    });

                    installHomebrew.stdout.on('data', function (data) {
                        console.info("" + data);
                    });
                    installHomebrew.stderr.on('data', function (data) {
                        console.error("" + data);
                    });
                    installHomebrew.on('close', function (code) {
                        homebrewInstalled.resolve({});
                    });
                    installHomebrew.on('error', function (arg) {
                        console.error("ERROR: " + JSON.stringify(arg));
                        process.exit(1);
                    });

                    homebrewInstalled.promise.then(function () {
                        // Install these packages if they do not exist.
                        // We need to check first since the install will fail if an older version is already installed.
                        // ideviceinstaller and ios-webkit-debug-proxy will install libimobiledevice if required
                        return Q.denodeify(child_process.exec)("(brew list ideviceinstaller | grep ideviceinstaller > /dev/null || brew install ideviceinstaller) && \
                                                            (brew list ios-webkit-debug-proxy | grep ios-webkit-debug-proxy > /dev/null || brew install ios-webkit-debug-proxy)");
                    }).then(function (success) {
                            // Verify that both of these can run.
                            Q.denodeify(child_process.exec)("ideviceinstaller -h > /dev/null && ios_webkit_debug_proxy -h > /dev/null")
                                .then(function (success) {
                                    console.info(resources.getString(nconf.get('lang'), "HomebrewInstallationSuccess"));
                                    deferred2.resolve(shouldInstall)
                    }, function (error) {
                                    console.error(resources.getString(nconf.get('lang'), "HomebrewPackageVerificationFailed", error));
                                    process.exit(1);
                                });
                        }, function (error) {
                            console.error(resources.getString(nconf.get('lang'), "HomebrewInstallationFailed", error));
                            process.exit(1);
                        });
                } else {
                    console.info(resources.getString(nconf.get('lang'), "HomebrewInstallationDeclined"));
                    deferred2.resolve(shouldInstall);
                }
            });

            deferred2.promise.then(function (shouldInstall) {
                child_process.exec("(DevToolsSecurity -enable || true)", function () {
                    // Write to the file. We don't read the contents, but it may help with user discoverability if they change their mind
                    fs.writeFileSync(firstRunPath, "installHomebrew = " + (shouldInstall ? "yes" : "no") + "\n");
                    deferred.resolve({});
                });
            })
        } else {
            deferred.resolve({});
        }
        return deferred.promise.then(function () {
            allowsEmulate = util.argToBool(nconf.get('allowsEmulate'));
            nativeDebugProxyPort = nconf.get('nativeDebugProxyPort');
            webDebugProxyDevicePort = nconf.get('webDebugProxyDevicePort');
            webDebugProxyPortMin = nconf.get('webDebugProxyRangeMin');
            webDebugProxyPortMax = nconf.get('webDebugProxyRangeMax');

            if (allowsEmulate === true) {
                require('./darwinEmulate').init();
            }
        });
    }

    printUsage(language: string): void {
        console.info(resources.getString(language, "UsageInformation"));
    }

    resetServerCert(conf: OSSpecifics.Conf): Q.Promise<any> {
        return certs.resetServerCert(conf);
    }

    generateClientCert(conf: OSSpecifics.Conf): Q.Promise<number> {
        return certs.generateClientCert(conf);
    }

    initializeServerCerts(conf: OSSpecifics.Conf): Q.Promise<OSSpecifics.ICertStore> {
        return certs.initializeServerCerts(conf);
    }

    removeAllCertsSync(conf: OSSpecifics.Conf): void {
        certs.removeAllCertsSync(conf);
    }

    createBuildProcess(): child_process.ChildProcess {
        return child_process.fork(path.join(__dirname, 'darwinBuild.js'), [], { silent: true });
    }

    downloadBuild(buildInfo: bi.BuildInfo, req: express.Request, res: express.Response, callback: Function): void {
        var platformOutputDir = path.join(buildInfo.appDir, 'platforms', 'ios', 'build', 'device');
        var pathToPlistFile = path.join(platformOutputDir, buildInfo.appName + '.plist');
        var pathToIpaFile = path.join(platformOutputDir, buildInfo.appName + '.ipa');
        if (!fs.existsSync(pathToPlistFile) || !fs.existsSync(pathToIpaFile)) {
            var msg = 'One or both of expected build outputs ' + pathToPlistFile + ' and ' + pathToIpaFile + ' are missing on file system.';
            console.info(msg);
            callback(msg, buildInfo);
            return;
        }

        var archive = new packer();
        archive.on('error', function (err) {
            console.error('Error from archiving ' + err.message, err);
            callback(err, buildInfo);
        });
        res.set({ 'Content-Type': 'application/zip' });
        archive.pipe(res);
        archive.entry(fs.createReadStream(pathToPlistFile), { name: buildInfo.appName + '.plist' }, function (err, file) {
            if (err) {
                console.error('Error from archiving plist file ' + err.message, err);
                callback(err, buildInfo);
                return;
            }
            archive.entry(fs.createReadStream(pathToIpaFile), { name: buildInfo.appName + '.ipa' }, function (err, file) {
                if (err) {
                    console.error('Error from archiving ipa file ' + err.message, err);
                    callback(err, buildInfo);
                    return;
                }
                archive.finalize();
                callback(null, buildInfo);
            });
        });
    }

    downloadClientCerts(req: express.Request, res: express.Response): void {
        Q.fcall<string>(certs.downloadClientCerts, req.params.pin).catch<string>(function (error) {
            if (error.code) {
                res.send(error.code, resources.getString(req, error.id));
            } else {
                res.send(404, error);
            }
            throw error;
            return "";
        }).then(function (pfxFile) {
            res.sendfile(pfxFile);
        }).then(function () { certs.invalidatePIN(req.params.pin);}).done();
            
    }

    emulateBuild(req: express.Request, res: express.Response): void {
        var buildInfo = buildManager.getBuildInfo(req.params.id);
        if (buildInfo === null) {
            res.send(404, resources.getString(req, 'BuildNotFound', req.params.id));
            return;
        }
        if (nconf.get('allowsEmulate') === false) {
            res.send(403, resources.getString(req, 'EmulateDisabled'));
            return;
        }

        var cfg = new CordovaConfig(path.join(buildInfo.appDir, 'config.xml'));
        var cordovaAppDir = path.join(buildInfo.buildDir, 'cordovaApp');
        if (!fs.existsSync(cordovaAppDir)) {
            res.send(404, resources.getString(req, 'BuildNotFound', req.params.id));
            return;
        }

        var emulateProcess = child_process.fork(path.join(__dirname, 'darwinEmulate.js'), [], { silent: true });
        var emulateLogger = new BuildLogger();
        emulateLogger.begin(buildInfo.buildDir, 'emulate.log', emulateProcess);
        emulateProcess.send({ appDir: cordovaAppDir, appName: cfg.id(), target: req.query.target }, undefined);

        emulateProcess.on('message', function (result) {
            buildInfo.updateStatus(result.status, result.messageId, result.messageArgs);
            if (result.status !== bi.ERROR) {
                res.send(200, buildInfo.localize(req));
            } else {
                res.send(404, buildInfo.localize(req));
            }
            emulateProcess.kill();
            emulateLogger.end();
        });
    }

    deployBuild(req: express.Request, res: express.Response): void {
        var buildInfo = buildManager.getBuildInfo(req.params.id);
        if (buildInfo === null) {
            res.send(404, resources.getString(req, 'BuildNotFound', req.params.id));
            return;
        }

        var pathToIpaFile = path.join(buildInfo.appDir, 'platforms', 'ios', 'build', 'device', buildInfo.appName + '.ipa');

        var ideviceinstaller = child_process.spawn('ideviceinstaller', ['-i', pathToIpaFile]);
        var stdout: string = "";
        var stderr: string = "";
        ideviceinstaller.stdout.on('data', function (data: any) {
            var dataStr: String = data.toString();
            if (dataStr.indexOf("ApplicationVerificationFailed") !== -1) {
                res.send(404, resources.getString(req, "ProvisioningFailed"));
            }
            stdout += dataStr;
        });
        ideviceinstaller.stderr.on('data', function (data: any) {
            var dataStr : string = data.toString();
            if (dataStr.toLowerCase().indexOf("error") !== -1) {
                res.send(404, dataStr);
            }
            stderr += dataStr;
        });
        ideviceinstaller.on('close', function (code: number) {
            if (code !== 0) {
                res.json(404, { stdout: stdout, stderr: stderr, code: code });
            } else {
                buildInfo.updateStatus(bi.INSTALLED, 'InstallSuccess');
                res.json(200, buildInfo.localize(req));
            }
        });
    }

    runBuild(req: express.Request, res: express.Response): void {
        var buildInfo = buildManager.getBuildInfo(req.params.id);
        if (buildInfo === null) {
            res.send(404, resources.getString(req, 'BuildNotFound', req.params.id));
            return;
        }

        var cfg = new CordovaConfig(path.join(buildInfo.appDir, 'config.xml'));
        appRunner.startDebugProxy(nativeDebugProxyPort)
            .then(function (nativeProxyProcess) {
                return appRunner.startApp(cfg.id(), nativeDebugProxyPort);
            })
            .then(function (debugSocket) {
                res.send(200, buildInfo.localize(req));
            }, function (failure) {
                if (failure instanceof Error) {
                    res.send(404, resources.getString(req, failure.message));
                } else {
                    res.send(404, resources.getString(req, failure));
                }
            });
    }

    debugBuild(req: express.Request, res: express.Response): void {
        var buildInfo = buildManager.getBuildInfo(req.params.id);
        if (buildInfo === null) {
            res.send(404, resources.getString(req, 'BuildNotFound', req.params.id));
            return;
        }

        if (webProxyInstance !== null) {
            webProxyInstance.kill();
            webProxyInstance = null;
        }

        var portRange = "null:" + webDebugProxyDevicePort + ",:" + webDebugProxyPortMin + "-" + webDebugProxyPortMax;
        try {
            webProxyInstance = child_process.spawn("ios_webkit_debug_proxy", ["-c", portRange]);
        } catch (e) {
            res.send(404, resources.getString(req, "UnableToDebug"));
            return;
        }
        buildInfo.webDebugProxyPort = webDebugProxyDevicePort;
        buildInfo.updateStatus(bi.DEBUGGING, 'DebugSuccess');
        res.send(200, buildInfo.localize(req));
    }

    getDebugPort(req: express.Request, res: express.Response): void {
        res.json(200, [{ 'webDebugPort': webDebugProxyDevicePort }]);
    }
}

var darwinSpecifics: OSSpecifics.IOsSpecifics = new DarwinSpecifics();
export = darwinSpecifics;