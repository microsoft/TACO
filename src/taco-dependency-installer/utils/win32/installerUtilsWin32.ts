/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

"use strict";

import childProcess = require ("child_process");
import path = require ("path");
import Q = require ("q");

import InstallerProtocol = require ("../../elevatedInstallerProtocol");
import installerUtils = require ("../installerUtils");
import tacoUtils = require ("taco-utils");
import resources = require ("../../resources/resourceManager");

import ILogger = InstallerProtocol.ILogger;
import utilHelper = tacoUtils.UtilHelper;

class InstallerUtilsWin32 {
    /*
     * Sets the specified environment variable to the specified value at the machine level (Windows only). If a variable with the same name already exists and is different than the specified
     * value, this will send a prompt request to the user via the provided logger to ask whether the existing variable should be overwritten. If the calling node.js process does not have
     * administrator privileges, the spawned process will fail and this method will return a rejected promise.
     *
     * @param {string} name The name of the environment variable to set
     * @param {string} value The desired value for the specified environment variable
     * @param {InstallerProtocol.ILogger} logger The logger for the current process
     *
     * @return {Q.Promise<any>} A promise resolved with an empty object if the operation succeeds, or rejected with the appropriate error if not
     */
    public static setEnvironmentVariableIfNeededWin32(name: string, value: string, logger: ILogger): Q.Promise<any> {
        return installerUtils.mustSetSystemVariable(name, value, logger)
            .then(function (mustSetVariable: boolean): Q.Promise<any> {
                if (mustSetVariable) {
                    return InstallerUtilsWin32.setEnvironmentVariableWin32(name, value);
                }

                return Q.resolve({});
            });
    }

    /*
     * Adds the specified value to the Path environment variable. If the provided value is already in the path, this method doesn't do anything. If the calling node.js process does not
     * have administrator privileges, the spawned process will fail and this method will return a rejected promise.
     *
     * @param {string[]} addToPath An array of path values to add to the Path environment variable
     *
     * @return {Q.Promise<any>} A promise resolved with an empty object if the operation succeeds, or rejected with the appropriate error if not
     */
    public static addToPathIfNeededWin32(addToPath: string[]): Q.Promise<any> {
        var pathName: string = "Path";
        var pathValue: string = process.env[pathName];

        addToPath.forEach(function (value: string): void {
            if (!installerUtils.pathContains(value)) {
                pathValue = value + path.delimiter + pathValue;
            }
        });

        if (pathValue === process.env[pathName]) {
            return Q.resolve({});
        }

        return InstallerUtilsWin32.setEnvironmentVariableWin32(pathName, pathValue);
    }

    /*
     * Sets the specified environment variable to the specified value at the machine level (Windows only). If the calling node.js process does not have administrator privileges,
     * the spawned process will fail and this method will return a rejected promise.
     *
     * @param {string} name The name of the environment variable to set
     * @param {string} value The desired value for the specified environment variable
     *
     * @return {Q.Promise<any>} A promise resolved with an empty object if the operation succeeds, or rejected with the appropriate error if not
     */
    public static setEnvironmentVariableWin32(name: string, value: string): Q.Promise<any> {
        if (process.platform !== "win32") {
            // No-op for platforms other than win32
            return Q.resolve({});
        }

        // Set variable for this running process
        process.env[name] = value;

        // Set variable for the system
        var scriptPath: string = path.resolve(__dirname, "setSystemVariable.ps1");
        var command: string = "powershell";
        var commandArgs: string[] = [
            "-executionpolicy",
            "unrestricted",
            "-file",
            utilHelper.quotesAroundIfNecessary(scriptPath),
            name,
            value
        ];
        var deferred: Q.Deferred<any> = Q.defer<any>();
        var errorOutput: string = "";
        var variableProcess: childProcess.ChildProcess = childProcess.spawn(command, commandArgs, { stdio: ["ignore", "ignore", "pipe"] });

        variableProcess.stderr.on("data", function (data: any): void {
            errorOutput += data.toString();
        });
        variableProcess.on("error", function (err: Error): void {
            // Handle ENOENT if Powershell is not found
            if (err.name === "ENOENT") {
                deferred.reject(new Error(resources.getString("NoPowershell")));
            } else {
                deferred.reject(new Error(resources.getString("UnableToSetVariable", name, err.name, value)));
            }
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
}

export = InstallerUtilsWin32;