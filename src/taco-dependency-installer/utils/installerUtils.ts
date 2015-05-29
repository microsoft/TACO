/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../../typings/hashFiles.d.ts" />
/// <reference path="../../typings/request.d.ts" />
/// <reference path="../../typings/wrench.d.ts" />

"use strict";

import childProcess = require ("child_process");
import fs = require ("fs");
import hashFiles = require ("hash-files");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import readline = require ("readline");
import request = require ("request");
import wrench = require ("wrench");

import InstallerProtocol = require ("../installerProtocol");
import tacoUtils = require ("taco-utils");
import resources = require ("../resources/resourceManager");

import utils = tacoUtils.UtilHelper;

module InstallerUtils {
    export interface IExpectedProperties {
        sha1?: string;
        bytes?: number;
    }
}

class InstallerUtils {
    /*
     * Verifies if the specified file is valid by comparing its sha1 signature and its size in bytes with the provided expectedSha1 and expectedBytes.
     */
    public static isFileClean(filePath: string, expectedProperties: InstallerUtils.IExpectedProperties): boolean {
        var isClean: boolean = true;

        if (expectedProperties) {
            if (expectedProperties.sha1 && expectedProperties.sha1 !== InstallerUtils.calculateFileSha1(filePath)) {
                isClean = false;
            }

            if (expectedProperties.bytes && expectedProperties.bytes !== InstallerUtils.getFileBytes(filePath)) {
                isClean = false;
            }
        }

        return isClean;
    }

    /*
     * Uses the request.Options object provided to download a file from a url and save it to filepath. Verifies that the downloaded file is valid using expectedSha1 and expectedBytes.
     * If the download fails, it will try again up to a maximum of maxDownloadAttempts (defaults to 1).
     */
    public static downloadFile(requestOptions: request.Options, filePath: string, expectedProperties: InstallerUtils.IExpectedProperties, maxDownloadAttempts: number = 1): Q.Promise<any> {
        // If the file already exists, verify that it is not corrupt
        if (fs.existsSync(filePath)) {
            if (InstallerUtils.isFileClean(filePath, expectedProperties)) {
                // We already have a clean file, use this one rather than downloading a new one
                return Q.resolve({});
            } else {
                // The existing file is not the expected one; delete it
                fs.unlinkSync(filePath);
            }
        } else {
            // Create the directory tree for the downloaded file
            wrench.mkdirSyncRecursive(path.dirname(filePath), 511); // 511 decimal is 0777 octal
        }

        // Build the promise chain for multiple attempts at downloading
        var promise: Q.Promise<any> = InstallerUtils.downloadFileInternal(requestOptions, filePath, expectedProperties);

        for (var i: number = 1; i < maxDownloadAttempts; i++) {
            promise = promise
                .then(function (): void {
                    // If the download succeeded, do nothing
                }, function (): Q.Promise<any> {
                    // If the download fails, try again.
                    // Note: there may be some specific error cases where we know retrying to download won't fix the issue. If we ever come across such a case, detect it here and don't retry.
                    return InstallerUtils.downloadFileInternal(requestOptions, filePath, expectedProperties);
                });
        }

        return promise;
    }

    /*
     * Returns a string where the %...% notations in the provided path have been replaced with their actual values. For example, calling this with "%programfiles%\foo"
     * would return "C:\Program Files\foo" (on most systems).
     */
    public static expandPath(filePath: string): string {
        return filePath.replace(/\%(.+?)\%/g, function (substring: string, ...args: any[]): string {
            if (process.env[args[0]]) {
                return process.env[args[0]];
            } else {
                // This is not an environment variable, can't replace it so leave it as is
                return args[0];
            }
        });
    }

    /*
     * Sets the specified environment variable to the specified value at the machine level (Windows only). If a variable with the same name already exists and is different than the specified
     * value, this will send a prompt request to the user over the provided socket to ask whether the existing variable should be overwritten. If the calling node.js process does not have
     * administrator privileges, the spawned process will fail and this method will return a rejected promise.
     */
    public static setEnvironmentVariableIfNeededWin32(name: string, value: string, socket: NodeJSNet.Socket): Q.Promise<any> {
        return InstallerUtils.mustSetSystemVariable(name, value, socket)
            .then(function (mustSetVariable: boolean): Q.Promise<any> {
                if (mustSetVariable) {
                    return InstallerUtils.setEnvironmentVariableWin32(name, value);
                }

                return Q.resolve({});
            });
    }

    /*
     * Adds the specified value to the Path environment variable. If the provided value is already in the path, this method doesn't do anything. If the calling node.js process does not
     * have administrator privileges, the spawned process will fail and this method will return a rejected promise.
     */
    public static addToPathIfNeededWin32(addToPath: string): Q.Promise<any> {
        var pathName: string = "Path";
        var pathValue: string = process.env[pathName];

        if (pathValue.indexOf(addToPath) !== -1) {
            // No need to change the path
            return Q.resolve({});
        }

        pathValue = addToPath + path.delimiter + pathValue;

        return InstallerUtils.setEnvironmentVariableWin32(pathName, pathValue);
    }

    /*
     * Sets the specified environment variable to the specified value at the machine level (Windows only). If the calling node.js process does not have administrator privileges,
     * the spawned process will fail and this method will return a rejected promise.
     */
    public static setEnvironmentVariableWin32(name: string, value: string): Q.Promise<any> {
        if (os.platform() !== "win32") {
            // No-op for platforms other than win32
            return Q.resolve({});
        }

        // Set variable for this running process
        process.env[name] = value;

        // Set variable for the system
        var scriptPath: string = path.resolve(__dirname, "win32", "setSystemVariable.ps1");
        var commandArgs: string[] = [
            "powershell",
            "-executionpolicy",
            "unrestricted",
            "-file",
            utils.quotesAroundIfNecessary(scriptPath),
            utils.quotesAroundIfNecessary(name),
            utils.quotesAroundIfNecessary(value)
        ];
        var deferred: Q.Deferred<any> = Q.defer<any>();
        var errorOutput: string = "";
        var variableProcess: childProcess.ChildProcess = childProcess.spawn("powershell", commandArgs);

        variableProcess.stderr.on("data", function (data: any): void {
            errorOutput += data.toString();
        });
        variableProcess.on("error", function (err: Error): void {
            deferred.reject(err);
        });
        variableProcess.on("close", function (code: number): void {
            if (errorOutput) {
                deferred.reject(new Error(errorOutput));
            } else {
                deferred.resolve({});
            }
        });

        return deferred.promise;
    }

    /*
     * Prompts the user with the specified message and returns a promise resolved with what the user typed.
     */
    public static promptUser(message: string): Q.Promise<string> {
        var deferred: Q.Deferred<any> = Q.defer<any>();
        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(message, function (answer: string): void {
            rl.close();

            deferred.resolve(answer);
        });

        return deferred.promise;
    }

    /*
     * Sends data over the provided socket using the InstallerProtocol format
     */
    public static sendData(socketHandle: NodeJSNet.Socket, dataType: InstallerProtocol.DataType, message: string): void {
        var data: InstallerProtocol.IData = {
            dataType: dataType,
            message: message
        };

        socketHandle.write(JSON.stringify(data) + "\n");
    }

    private static mustSetSystemVariable(name: string, value: string, socket: NodeJSNet.Socket): Q.Promise<boolean> {
        if (!process.env[name] || process.env[name] === value) {
            return Q.resolve(true);
        }

        return InstallerUtils.promptForOverwrite(name, value, socket)
            .then(function (answer: string): Q.Promise<boolean> {
                if (answer === resources.getString("YesString")) {
                    InstallerUtils.sendData(socket, InstallerProtocol.DataType.Output, resources.getString("OverwritingVariable", name));

                    return Q.resolve(true);
                } else {
                    InstallerUtils.sendData(socket, InstallerProtocol.DataType.Output, resources.getString("SkipOverwriteWarning", name, value));

                    return Q.resolve(false);
                }
            });
    }

    private static promptForOverwrite(name: string, value: string, socket: NodeJSNet.Socket): Q.Promise<string> {
        var deferred: Q.Deferred<string> = Q.defer<string>();

        var dataListener = function (data: Buffer): void {
            var stringData = data.toString();

            socket.removeListener("data", dataListener);
            deferred.resolve(stringData);
        };

        InstallerUtils.sendData(socket, InstallerProtocol.DataType.Warn, resources.getString("SystemVariableExists", name));
        socket.on("data", dataListener);
        InstallerUtils.sendData(socket, InstallerProtocol.DataType.Prompt, resources.getString("YesExampleString"));

        return deferred.promise;
    }

    private static calculateFileSha1(filePath: string): string {
        var options: hashFiles.IOptions = {
            files: [filePath],
            noGlob: true,
            algorithm: "sha1"
        };

        return hashFiles.sync(options);
    }

    private static getFileBytes(filePath: string): number {
        return fs.statSync(filePath).size;
    }

    private static downloadFileInternal(requestOptions: request.Options, filePath: string, expectedProperties: InstallerUtils.IExpectedProperties): Q.Promise<any> {
        var deferred: Q.Deferred<any> = Q.defer<any>();

        request(requestOptions)
            .on("error", function (err: Error): void {
                deferred.reject(err);
            })
            .on("response", function (response: any): void {
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    // Even though 1xx and 3xx codes aren't error codes, it still means that the specified URL does not point to a downloadable file, so error out
                    deferred.reject(new Error(resources.getString("FileNotFound")));
                }

                var fws = fs.createWriteStream(filePath);

                response.pipe(fws);
                fws.on("finish", function (): void {
                    // Verify if the file is clean
                    if (InstallerUtils.isFileClean(filePath, expectedProperties)) {
                        deferred.resolve({});
                    } else {
                        deferred.reject(new Error(resources.getString("FileCorruptError")));
                    }
                });
                fws.on("error", function (err: Error): void {
                    deferred.reject(err);
                });
            });

        return deferred.promise;
    }
}

export = InstallerUtils;