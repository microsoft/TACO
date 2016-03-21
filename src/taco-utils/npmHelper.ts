// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/npm.d.ts" />
/// <reference path="../typings/q.d.ts" />

"use strict";

import child_process = require("child_process");
import os = require("os");
import path = require("path");
import Q = require("q");

import installLogLevel = require("./installLogLevel");
import InstallLogLevel = installLogLevel.InstallLogLevel;

module TacoUtility {
    export class NpmHelper {
        private static runNpmCommand(npmCommand: string, args: string[], workingDirectory: string, commandFlags?: string[], logLevel?: InstallLogLevel, silent: boolean = false): Q.Promise<string[]> {

            const spawnArgs = [npmCommand].concat(args).concat(commandFlags || []);

            const options = {
                cwd: workingDirectory,
                stdio: silent ? "pipe" : "inherit"
            };

            const npmExecutableName = "npm" + (os.platform() === "win32" ? ".cmd" : "");

            const npmProcess = child_process.spawn(npmExecutableName, spawnArgs, options);
            const deferred = Q.defer<any>();

            let stdout = "";
            let stderr = "";

            npmProcess.on("error", (err: Error) => deferred.reject(err));

            if (silent) {
                npmProcess.stdout.on("data", (data: Buffer) => {
                    stdout += data.toString();
                });

                npmProcess.stderr.on("data", (data: Buffer) => {
                    stderr += data.toString();
                });
            }

            npmProcess.on("exit", (code: number, signal: string) => {
                if (code === 0) {
                    deferred.resolve([stdout, stderr]);
                }
            });

            return deferred.promise;

        }

        public static install(packageId: string, workingDirectory?: string, commandFlags?: string[], logLevel?: InstallLogLevel): Q.Promise<any> {
            return NpmHelper.runNpmCommand("install", [packageId], workingDirectory, commandFlags, logLevel);
        }

        // Returns the output of "npm view" as a javascript object
        public static view(packageId: string, fields?: string[], workingDirectory?: string, commandFlags?: string[], logLevel?: InstallLogLevel): Q.Promise<any> {
            var args = [packageId].concat(fields);
            return NpmHelper.runNpmCommand("view", args, workingDirectory, commandFlags, logLevel, /*silent=*/true)
                .then(([stdout, stderr]) => {
                    return JSON.parse(stdout.replace(/'/g, '"'));
                });
        }


    }
}

export = TacoUtility;
