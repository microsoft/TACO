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

import InstallerProtocol = require ("../elevatedInstallerProtocol");
import tacoErrorCodes = require ("../tacoErrorCodes");
import errorHelper = require ("../tacoErrorHelper");
import tacoUtils = require ("taco-utils");
import resources = require ("../resources/resourceManager");

import installerDataType = InstallerProtocol.DataType;
import ILogger = InstallerProtocol.ILogger;
import TacoErrorCodes = tacoErrorCodes.TacoErrorCode;
import utils = tacoUtils.UtilHelper;

module InstallerUtils {
    export interface IFileSignature {
        sha1?: string;
        bytes?: number;
    }
}

class InstallerUtils {
    private static pathName: string = os.platform() === "win32" ? "Path" : "PATH";
    /**
     * Verifies if the specified file is valid by comparing its sha1 signature and its size in bytes with the provided expectedSha1 and expectedBytes.
     *
     * @param {string} filePath Path to the file to verify
     * @param {InstallerUtils.IFileSignature} fileSignature Signature of the file, may include byte size and SHA1 checksum
     *
     * @return {boolean} A boolean indicating whether the file has the expected signature or not
     */
    public static isFileClean(filePath: string, fileSignature: InstallerUtils.IFileSignature): boolean {
        var isClean: boolean = true;

        if (fileSignature) {
            if (fileSignature.sha1 && fileSignature.sha1 !== InstallerUtils.calculateFileSha1(filePath)) {
                isClean = false;
            }

            if (fileSignature.bytes && fileSignature.bytes !== InstallerUtils.getFileBytes(filePath)) {
                isClean = false;
            }
        }

        return isClean;
    }

    /**
     * Uses the request.Options object provided to download a file from a url and save it to filepath. Verifies that the downloaded file is valid using expectedSha1 and expectedBytes.
     * If the download fails, it will try again up to a maximum of maxDownloadAttempts (defaults to 1).
     *
     * @param {request.Options} options The request package options to put in the request
     * @param {string} filePath The path to which save the downloaded file
     * @param {InstallerUtils.IFileSignature} fileSignature The expected file signature (byte size and SHA1 checksum) of the downloaded file
     * @param {number} maxDownloadAttempts = 1 The maximum number of tries before returning an error
     *
     * @return {Q.Promise<any>} A promise resolved with an empty object if the download succeeds, or rejected with the appropriate error otherwise
     */
    public static downloadFile(requestOptions: request.Options, filePath: string, fileSignature: InstallerUtils.IFileSignature, maxDownloadAttempts: number = 1): Q.Promise<any> {
        // If the file already exists, verify that it is not corrupt
        if (fs.existsSync(filePath)) {
            if (InstallerUtils.isFileClean(filePath, fileSignature)) {
                // We already have a clean file, use this one rather than downloading a new one
                return Q.resolve({});
            }

            // The existing file is not the expected one; delete it
            fs.unlinkSync(filePath);
        } else {
            // Create the directory tree for the downloaded file
            wrench.mkdirSyncRecursive(path.dirname(filePath), 511); // 511 decimal is 0777 octal
        }

        // Build the promise chain for multiple attempts at downloading
        var promise: Q.Promise<any> = Q.reject<any>();

        for (var i: number = 0; i < maxDownloadAttempts; i++) {
            promise = promise
                .then(function (): void {
                    // If the download succeeded, do nothing
                }, function (): Q.Promise<any> {
                    // If the download fails, try again.
                    // Note: there may be some specific error cases where we know retrying to download won't fix the issue. If we ever come across such a case, detect it here and don't retry.
                    return InstallerUtils.downloadFileInternal(requestOptions, filePath, fileSignature);
                });
        }

        return promise;
    }

    /**
     * Prompts the user with the specified message and returns a promise resolved with what the user typed.
     *
     * @param {string} message The message that should be used to question the user for the prompt
     *
     * @return {Q.Promise<string>} A promise resolved with the user's response
     */
    public static promptUser(message: string): Q.Promise<string> {
        var deferred: Q.Deferred<any> = Q.defer<any>();
        var rl: readline.ReadLine = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question(message, function (answer: string): void {
            rl.close();

            deferred.resolve(answer);
        });

        return deferred.promise;
    }

    /**
     * Determines whether the specified environment variable needs to be set or not. If the variable doesn't exist, the result is true. If the variable already exists but is set to the desired value, the
     * result is false. If it exists but is different than what is desired, the user will be prompted for overwrite, and the result will depend on the user's answer. The result is wrapped in a promise.
     *
     * @param {string} name The name of the environment variable to set
     * @param {string} value The desired value for the specified environment variable
     * @param {InstallerProtocol.ILogger} logger The logger for the current process
     *
     * @return {Q.Promise<boolean>} A promise resolved with a boolean indicating whether the specified environment variable must be set
     */
    public static mustSetSystemVariable(name: string, value: string, logger: ILogger): Q.Promise<boolean> {
        if (!process.env[name]) {
            return Q.resolve(true);
        } else if (path.resolve(utils.expandEnvironmentVariables(process.env[name])) === path.resolve(utils.expandEnvironmentVariables(value))) {
            // If this environment variable is already defined, but it is already set to what we need, we don't need to set it again
            return Q.resolve(false);
        }

        return logger.promptForEnvVariableOverwrite(name)
            .then(function (answer: string): Q.Promise<boolean> {
                if (answer === resources.getString("YesString")) {
                    logger.log(resources.getString("OverwritingVariable", name));

                    return Q.resolve(true);
                } else {
                    logger.log(resources.getString("SkipOverwriteWarning", name, value));

                    return Q.resolve(false);
                }
            });
    }

    /**
     * Prompts the user for permission to overwrite the specified system environment variable. Uses the specified socket for communication.
     *
     * @param {string} name The name of the environment variable to set
     * @param {NodeJSNet.Socket} socket The socket over which to send the prompt request
     *
     * @return {Q.Promise<string>} A promise resolved with a string containing the user's response to the prompt
     */
    public static promptForEnvVariableOverwrite(name: string, socket: NodeJSNet.Socket): Q.Promise<string> {
        var deferred: Q.Deferred<string> = Q.defer<string>();

        var dataListener: (data: Buffer) => void = function (data: Buffer): void {
            var stringData: string = data.toString();

            socket.removeListener("data", dataListener);
            deferred.resolve(stringData);
        };

        InstallerUtils.sendData(socket, resources.getString("SystemVariableExists", name));
        socket.on("data", dataListener);
        InstallerUtils.sendData(socket, resources.getString("YesExampleString"), installerDataType.Prompt);

        return deferred.promise;
    }

    /**
     * Searches the provided Path environment variable value for the specified value
     *
     * @param {string} valueToCheck The value to check for in the Path environment variable
     * @param {string} pathValue The current value of the Path variable
     *
     * @return {boolean} A boolean set to true if the Path system variable already contains the specified value in one of its segments
     */
    public static pathContains(valueToCheck: string, pathValue: string = process.env[InstallerUtils.pathName]): boolean {
        if (!pathValue) {
            return false;
        }

        return pathValue.split(path.delimiter).some(function (segment: string): boolean {
            return path.resolve(utils.expandEnvironmentVariables(segment)) === path.resolve(utils.expandEnvironmentVariables(valueToCheck));
        });
    }

    /**
     * Sends data over the provided socket using the InstallerProtocol format
     *
     * @param {NodeJSNet.Socket} socketHandle The socket to use for the communication
     * @param {string} message The message to send over the socket
     * @param {InstallerProtocol.DataType} dataType = InstallerProtocol.DataType.Log The type of data to send over the socket
     */
    public static sendData(socketHandle: NodeJSNet.Socket, message: string, dataType: installerDataType = installerDataType.Log): void {
        var data: InstallerProtocol.IElevatedInstallerMessage = {
            dataType: dataType,
            message: message
        };

        socketHandle.write(JSON.stringify(data) + os.EOL);
    }

    /**
     * Globally tnstalls the given package from npm
     *
     * @param {stringt} npmPackage The name of the npm package
     *
     * @return {Q.Promise} An empty promise if the operation succeeds
     */
    public static installNpmPackage(npmPackage: string): Q.Promise<any> {
        var deferred: Q.Deferred<any> = Q.defer<any>();
        var command: string = "npm install -g " + npmPackage;

        childProcess.exec(command, function (error: Error, stdout: Buffer, stderr: Buffer): void {
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve({});
            }
        });

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

    private static downloadFileInternal(requestOptions: request.Options, filePath: string, expectedProperties: InstallerUtils.IFileSignature): Q.Promise<any> {
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

                var fws: fs.WriteStream = fs.createWriteStream(filePath);

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
