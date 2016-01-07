/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../typings/cordovaExtensions.d.ts" />
/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/semver.d.ts" />


"use strict";

import assert = require("assert");
import child_process = require("child_process");
import path = require("path");
import Q = require("q");
import semver = require("semver");
import util = require("util");
import os = require ("os");

import commands = require("./commands");
import errorHelper = require("./tacoErrorHelper");
import cordovaHelper = require("./cordovaHelper");
import installLogLevel = require("./installLogLevel");
import projectHelper = require("./projectHelper");
import tacoErrorCodes = require("./tacoErrorCodes");

import Commands = commands.Commands;
import CordovaHelper = cordovaHelper.CordovaHelper;
import ProjectHelper = projectHelper.ProjectHelper;
import TacoErrorCodes = tacoErrorCodes.TacoErrorCode;
import InstallLogLevel = installLogLevel.InstallLogLevel;
import logger = require("./logger");
import Logger = logger.Logger;

module TacoUtility {
    export class CordovaWrapper {
        private static CORDOVA_CHECK_REQS_MIN_VERSION: string = "5.1.1";

        public static cli(args: string[], captureOutput?: boolean): Q.Promise<any> {
            captureOutput = captureOutput || false;
            return CordovaHelper.getCordovaExecutable().then(function(executablePath: string): Q.Promise<string> {
                var deferred = Q.defer<string>();
                var output: string = "";
                var errorOutput: string = "";
                var options: child_process.IExecOptions = captureOutput ? { stdio: "pipe" } : { stdio: "inherit" };

                var proc = child_process.spawn(executablePath, args, options);

                proc.on("error", function(err: any): void {
                    // ENOENT error thrown if no Cordova.cmd is found
                    var tacoError = (err.code === "ENOENT") ?
                        errorHelper.get(TacoErrorCodes.CordovaCmdNotFound) :
                        errorHelper.wrap(TacoErrorCodes.CordovaCommandFailedWithError, err, args.join(" "));
                    deferred.reject(tacoError);
                });

                if (captureOutput) {
                    proc.stdout.on("data", function(data: Buffer): void {
                        output += data.toString();
                    });
                    proc.stderr.on("data", function(data: Buffer): void {
                        errorOutput += data.toString();
                    });
                }

                proc.on("close", function(code: number): void {
                    if (code) {
                        // Special handling for 'cordova requirements': this Cordova command returns an error when some requirements are not installed, when technically this is not really an error (the command executes
                        // correctly and reports that some requirements are missing). In that case, if the captureOutput flag is set, we don't want to report an error. To detect this case, we have to parse the returned
                        // error output because there is no specific error code for this case. For now, we just look for the "Some of requirements check failed" sentence.
                        if (captureOutput && output && args[0] === "requirements" && code === 1 && errorOutput && errorOutput.indexOf("Some of requirements check failed") !== -1) {
                            deferred.resolve(output);
                        } else {
                            var tacoError = errorOutput ?
                                errorHelper.wrap(TacoErrorCodes.CordovaCommandFailedWithError, new Error(errorOutput), args.join(" ")) :
                                errorHelper.get(TacoErrorCodes.CordovaCommandFailed, code, args.join(" "));
                            deferred.reject(tacoError);
                        }
                    } else {
                        if (captureOutput && output) {
                            deferred.resolve(output);
                        } else {
                            deferred.resolve("");
                        }
                    }
                });

                return deferred.promise;
            });
        }

        public static build(commandData: Commands.ICommandData, platforms?: string[]): Q.Promise<any> {
            platforms = platforms || null;
            return CordovaWrapper.cordovaApiOrProcess((cordova: Cordova.ICordova) => {
                return cordova.raw.build(CordovaHelper.toCordovaBuildArguments(commandData, platforms));
            }, () => ["build"].concat(CordovaHelper.toCordovaCliArguments(commandData, platforms)));
        }

        /**
         * Static method to invoke cordova platform command
         *
         * @param {string} The name of the platform sub-command to be invoked
         * @param {ICommandData} wrapping commandData object
         * @param {string} list of platforms to add/remove
         * @param {ICordovaPlatformOptions} platform options if any
         *
         * @return {Q.Promise<any>} An empty promise
         */
        public static platform(subCommand: string, commandData: Commands.ICommandData, platforms?: string[], options?: Cordova.ICordovaPlatformOptions, isSilent?: boolean): Q.Promise<any> {
            isSilent = isSilent || false;
            return CordovaWrapper.cordovaApiOrProcess((cordova: Cordova.ICordova) => {
                    return cordova.raw.platform(subCommand, platforms, options);
            }, () => {
                assert(commandData);
                return ["platform"].concat(CordovaHelper.toCordovaCliArguments(commandData));
            }, { logLevel: InstallLogLevel.warn, isSilent: isSilent }); // Subscribe to event listeners only if we are not in silent mode
        }

        /**
         * Static method to invoke cordova plugin command
         *
         * @param {string} The name of the plugin sub-command to be invoked
         * @param {string} list of plugins to add/remove
         * @param {ICordovaPluginOptions} plugin options if any
         * @param {ICommandData} wrapping commandData object
         *
         * @return {Q.Promise<any>} An empty promise
         */
        public static plugin(subCommand: string, commandData: Commands.ICommandData, plugins?: string[], options?: Cordova.ICordovaPluginOptions, isSilent?: boolean): Q.Promise<any> {
            isSilent = isSilent || false;
            return CordovaWrapper.cordovaApiOrProcess((cordova: Cordova.ICordova) => {
                    return cordova.raw.plugin(subCommand, plugins, options);
            }, () => {
                assert(commandData);
                return ["plugin"].concat(CordovaHelper.toCordovaCliArguments(commandData));
            }, { logLevel: InstallLogLevel.warn, isSilent: isSilent }); // Subscribe to event listeners only if we are not in silent mode
        }

        public static emulate(commandData: Commands.ICommandData, platforms?: string[]): Q.Promise<any> {
            platforms = platforms || null;
            return CordovaWrapper.cordovaApiOrProcess((cordova: Cordova.ICordova) => {
                return cordova.raw.emulate(CordovaHelper.toCordovaRunArguments(commandData, platforms));
            }, () => ["emulate"].concat(CordovaHelper.toCordovaCliArguments(commandData, platforms)));
        }

        public static requirements(platforms: string[]): Q.Promise<any> {
            return CordovaWrapper.getCordovaVersion()
                .then(function(version: string): Q.Promise<any> {
                // If the cordova version is older than 5.1.0, the 'requirements' command does not exist
                if (!semver.gte(version, CordovaWrapper.CORDOVA_CHECK_REQS_MIN_VERSION)) {
                    return Q.reject(errorHelper.get(TacoErrorCodes.CommandInstallCordovaTooOld, version, CordovaWrapper.CORDOVA_CHECK_REQS_MIN_VERSION));
                }

                return Q.resolve({});
            })
                .then(function(): Q.Promise<any> {
                return CordovaWrapper.cordovaApiOrProcess((cordova: Cordova.ICordova510) => {
                    return cordova.raw.requirements(platforms);
                }, () => {
                        return ["requirements"].concat(platforms || []);
                    }, { logLevel: InstallLogLevel.silent, captureOutput: true });
            });
        }

        /**
         * Wrapper for 'cordova create' command.
         *
         * @param {string} The version of the cordova CLI to use
         * @param {ICordovaCreateParameters} The cordova create options
         *
         * @return {Q.Promise<any>} An empty promise
         */
        public static create(cordovaCliVersion: string, cordovaParameters: Cordova.ICordovaCreateParameters): Q.Promise<any> {
            CordovaHelper.prepareCordovaConfig(cordovaParameters);
            return CordovaHelper.wrapCordovaInvocation<any>(cordovaCliVersion, (cordova: Cordova.ICordova) => {
                return cordova.raw.create(cordovaParameters.projectPath, cordovaParameters.appId, cordovaParameters.appName, cordovaParameters.cordovaConfig);
            }, InstallLogLevel.error);
        }

        public static getGlobalCordovaVersion(): Q.Promise<string> {
            return CordovaWrapper.cli(["-v"], true).then(function(output: string): string {
                return output.split("\n")[0].split(" ")[0];
            });
        }

        public static getCordovaVersion(): Q.Promise<string> {
            return ProjectHelper.getProjectInfo().then(function(projectInfo: IProjectInfo): Q.Promise<string> {
                if (projectInfo.cordovaCliVersion) {
                    return Q.resolve(projectInfo.cordovaCliVersion);
                } else {
                    return CordovaWrapper.getGlobalCordovaVersion();
                }
            });
        }

        public static run(commandData: Commands.ICommandData, platforms?: string[]): Q.Promise<any> {
            platforms = platforms || null;
            return CordovaWrapper.cordovaApiOrProcess((cordova: Cordova.ICordova) => {
                return cordova.raw.run(CordovaHelper.toCordovaRunArguments(commandData, platforms));
            }, () => ["run"].concat(CordovaHelper.toCordovaCliArguments(commandData, platforms)));
        }

        public static targets(commandData: Commands.ICommandData, platforms?: string[]): Q.Promise<any> {
            platforms = platforms || null;
            // Note: cordova <= 5.3.3 expects the options to "targets" to include "--list". If it does not,
            // it blindly splices off the last argument.
            return CordovaWrapper.cordovaApiOrProcess((cordova: Cordova.ICordova) => {
                return cordova.raw.targets(CordovaHelper.toCordovaTargetsArguments(commandData, platforms));
            }, () => ["targets"].concat(CordovaHelper.toCordovaCliArguments(commandData, platforms)));
        }

        /**
         * Perform an operation using either the Cordova API, or spwaning a Cordova process.
         * The first argument is a function which is given a Cordova object, and can operate on it as it wishes.
         * The second argument is a function which should return a list of strings to use as arguments to a Cordova process.
         *
         * We use a function for the second argument to delay computation until it is needed: If we are able to use the Cordova
         * in-process then we don't need to bother computing the CLI arguments.
         */
        private static cordovaApiOrProcess<T>(apiFunction: (cordova: Cordova.ICordova) => T | Q.Promise<T>, processArgs: () => string[],
            options: { logLevel?: InstallLogLevel, isSilent?: boolean, captureOutput?: boolean } = {}): Q.Promise<T | string> {
            return CordovaHelper.tryInvokeCordova<T | string>(apiFunction, () => CordovaWrapper.cli(processArgs(), options.captureOutput), options);
        }
    }
}

export = TacoUtility;
