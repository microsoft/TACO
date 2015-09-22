/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../../typings/cordovaExtensions.d.ts" />
/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/Q.d.ts" />
/// <reference path="../../../typings/semver.d.ts" />

"use strict";

import assert = require ("assert");
import child_process = require ("child_process");
import domain = require ("domain");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import semver = require ("semver");
import util = require ("util");

import cordovaHelper = require ("./cordovaHelper");
import projectHelper = require ("./projectHelper");
import resources = require ("../../resources/resourceManager");
import TacoErrorCodes = require ("../tacoErrorCodes");
import errorHelper = require ("../tacoErrorHelper");
import tacoUtility = require ("taco-utils");

import commands = tacoUtility.Commands;
import ConfigParser = Cordova.cordova_lib.configparser;
import packageLoader = tacoUtility.TacoPackageLoader;

class CordovaWrapper {
    private static CordovaCommandName: string = os.platform() === "win32" ? "cordova.cmd" : "cordova";
    private static CordovaRequirementsMinVersion: string = "5.1.1";
    private static CordovaNpmPackageName: string = "cordova";

    public static cli(args: string[], captureOutput: boolean = false): Q.Promise<string> {
        var deferred = Q.defer<string>();
        var output: string = "";
        var errorOutput: string = "";
        var options: child_process.IExecOptions = captureOutput ? { stdio: "pipe" } : { stdio: "inherit" };
        var proc = child_process.spawn(CordovaWrapper.CordovaCommandName, args, options);

        proc.on("error", function (err: any): void {  
            // ENOENT error thrown if no Cordova.cmd is found
            var tacoError = (err.code === "ENOENT") ?
                errorHelper.get(TacoErrorCodes.CordovaCmdNotFound) :
                errorHelper.wrap(TacoErrorCodes.CordovaCommandFailedWithError, err, args.join(" "));
            deferred.reject(tacoError);
        });

        if (captureOutput) {
            proc.stdout.on("data", function (data: Buffer): void {
                output += data.toString();
            });
            proc.stderr.on("data", function (data: Buffer): void {
                errorOutput += data.toString();
            });
        }

        proc.on("close", function (code: number): void {
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
    }

    public static build(commandData: commands.ICommandData, platform: string = null): Q.Promise<any> {
        return CordovaWrapper.cordovaApiOrProcess((cordova: Cordova.ICordova) => {
            return cordova.raw.build(cordovaHelper.toCordovaBuildArguments(commandData, platform));
        }, () => ["build"].concat(cordovaHelper.toCordovaCliArguments(commandData, platform)));
    }

    /**
     * Static method to invoke a cordova command. Used to invoke the 'platform' or 'plugin' command
     *
     * @param {string} The name of the cordova command to be invoked
     * @param {string} The version of the cordova CLI to use
     * @param {ICordovaCommandParameters} The cordova command parameters
     *
     * @return {Q.Promise<any>} An empty promise
     */
    public static invokePlatformPluginCommand(command: string, platformCmdParameters: Cordova.ICordovaCommandParameters, data: commands.ICommandData = null, isSilent: boolean = false): Q.Promise<any> {
        return CordovaWrapper.cordovaApiOrProcess((cordova: Cordova.ICordova) => {
                if (command === "platform") {
                    return cordova.raw.platform(platformCmdParameters.subCommand, platformCmdParameters.targets, platformCmdParameters.downloadOptions);
                } else if (command === "plugin") {
                    return cordova.raw.plugin(platformCmdParameters.subCommand, platformCmdParameters.targets, platformCmdParameters.downloadOptions);
                } else {
                    return Q.reject(errorHelper.get(TacoErrorCodes.CordovaCmdNotFound));
                }
        }, () => {
            assert(data);
            return [command].concat(cordovaHelper.toCordovaCliArguments(data))
        }, { logLevel: tacoUtility.InstallLogLevel.warn, isSilent: isSilent }); // Subscribe to event listeners only if we are not in silent mode
    }

    public static emulate(commandData: commands.ICommandData, platform: string = null): Q.Promise<any> {
        return CordovaWrapper.cordovaApiOrProcess((cordova: Cordova.ICordova) => {
            return cordova.raw.emulate(cordovaHelper.toCordovaRunArguments(commandData, platform));
        }, () => ["emulate"].concat(cordovaHelper.toCordovaCliArguments(commandData, platform)));
    }

    public static requirements(platforms: string[]): Q.Promise<any> {
        return CordovaWrapper.getCordovaVersion()
            .then(function (version: string): Q.Promise<any> {
                // If the cordova version is older than 5.1.0, the 'requirements' command does not exist
                if (!semver.gte(version, CordovaWrapper.CordovaRequirementsMinVersion)) {
                    return Q.reject(errorHelper.get(TacoErrorCodes.CommandInstallCordovaTooOld, version, CordovaWrapper.CordovaRequirementsMinVersion));
                }

                return Q.resolve({});
            })
            .then(function (): Q.Promise<any> {
                return CordovaWrapper.cordovaApiOrProcess((cordova: Cordova.ICordova510) => {
                        return cordova.raw.requirements(platforms);
                }, () => {
                    return ["requirements"].concat(platforms || []);
                }, { logLevel: tacoUtility.InstallLogLevel.silent, captureOutput: true });
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
        cordovaHelper.prepareCordovaConfig(cordovaParameters);
        return CordovaWrapper.wrapCordovaInvocation<any>(cordovaCliVersion, (cordova: Cordova.ICordova) => {
            return cordova.raw.create(cordovaParameters.projectPath, cordovaParameters.appId, cordovaParameters.appName, cordovaParameters.cordovaConfig);
        }, tacoUtility.InstallLogLevel.taco);
    }

    public static getGlobalCordovaVersion(): Q.Promise<string> {
        return CordovaWrapper.cli(["-v"], true).then(function (output: string): string {
            return output.split("\n")[0];
        });
    }

    public static getCordovaVersion(): Q.Promise<string> {
        return projectHelper.getProjectInfo().then(function (projectInfo: projectHelper.IProjectInfo): Q.Promise<string> {
            if (projectInfo.cordovaCliVersion) {
                return Q.resolve(projectInfo.cordovaCliVersion);
            } else {
                return CordovaWrapper.getGlobalCordovaVersion();
            }
        });
    }

    public static run(commandData: commands.ICommandData, platform: string = null): Q.Promise<any> {
        return CordovaWrapper.cordovaApiOrProcess((cordova: Cordova.ICordova) => {
            return cordova.raw.run(cordovaHelper.toCordovaRunArguments(commandData, platform));
        }, () => ["run"].concat(cordovaHelper.toCordovaCliArguments(commandData, platform)));
    }

    public static cordovaApiOrOther<T>(apiFunction: (cordova: Cordova.ICordova) => T | Q.Promise<T>, otherFunction: () => Q.Promise<T>,
        options: { logLevel?: tacoUtility.InstallLogLevel, isSilent?: boolean } = {}): Q.Promise<T> {
        return projectHelper.getProjectInfo().then(function (projectInfo: projectHelper.IProjectInfo): Q.Promise<any> {
            if (projectInfo.cordovaCliVersion) {
                return CordovaWrapper.wrapCordovaInvocation<T>(projectInfo.cordovaCliVersion, apiFunction, options.logLevel || tacoUtility.InstallLogLevel.taco, options.isSilent);
            } else {
                return otherFunction();
            }
        });
    }

    private static cordovaApiOrProcess<T>(apiFunction: (cordova: Cordova.ICordova) => T | Q.Promise<T>, processArgs: () => string[],
        options: { logLevel?: tacoUtility.InstallLogLevel, isSilent?: boolean, captureOutput?: boolean } = {}): Q.Promise<T | string> {
        return CordovaWrapper.cordovaApiOrOther<T | string>(apiFunction, () => CordovaWrapper.cli(processArgs(), options.captureOutput), options);
    }

    private static wrapCordovaInvocation<T>(cliVersion: string, func: (cordova: Cordova.ICordova) => T | Q.Promise<T>, logVerbosity: tacoUtility.InstallLogLevel = tacoUtility.InstallLogLevel.warn, silent: boolean = false): Q.Promise<T> {
        return packageLoader.lazyRequire(CordovaWrapper.CordovaNpmPackageName, CordovaWrapper.CordovaNpmPackageName + "@" + cliVersion, logVerbosity)
            .then(function (cordova: typeof Cordova): Q.Promise<any> {
                if (!silent) {
                    cordova.on("results", console.info);
                    cordova.on("warn", console.warn);
                    cordova.on("error", console.error);
                    cordova.on("log", console.log);
                }

                var dom = domain.create();
                var deferred = Q.defer<T>();

                dom.on("error", function (err: any): void {
                    deferred.reject(errorHelper.wrap(TacoErrorCodes.CordovaCommandUnhandledException, err));
                    // Note: At this point the state can be arbitrarily bad, so we really shouldn't try to recover much from here
                });

                dom.run(function (): void {
                    Q(func(cordova)).done((result: T) => deferred.resolve(result), (err: any) => deferred.reject(err));
                });

                return deferred.promise.finally(() => {
                    if (!silent) {
                        cordova.off("results", console.info);
                        cordova.off("warn", console.warn);
                        cordova.off("error", console.error);
                        cordova.off("log", console.log);
                    }
                });
            });
    }
}

export = CordovaWrapper;
