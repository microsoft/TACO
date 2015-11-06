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

import assert = require("assert");
import child_process = require("child_process");
import os = require("os");
import path = require("path");
import Q = require("q");
import semver = require("semver");
import util = require("util");

import CordovaHelper = require("./cordovaHelper");
import projectHelper = require("./projectHelper");
import resources = require("../../resources/resourceManager");
import TacoErrorCodes = require("../tacoErrorCodes");
import errorHelper = require("../tacoErrorHelper");
import tacoUtility = require("taco-utils");

import livereloadHelper = require("./liveReloadHelper");

import commands = tacoUtility.Commands;
import ConfigParser = Cordova.cordova_lib.configparser;
import packageLoader = tacoUtility.TacoPackageLoader;

class CordovaWrapper {
    private static cordovaCommandName: string = os.platform() === "win32" ? "cordova.cmd" : "cordova";
    private static CORDOVA_CHECK_REQS_MIN_VERSION: string = "5.1.1";

    public static cli(args: string[], captureOutput: boolean = false): Q.Promise<string> {
        var deferred = Q.defer<string>();
        var output: string = "";
        var errorOutput: string = "";
        var options: child_process.IExecOptions = captureOutput ? { stdio: "pipe" } : { stdio: "inherit" };
        var proc = child_process.spawn(CordovaWrapper.cordovaCommandName, args, options);

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
    }

    public static build(commandData: commands.ICommandData, platforms: string[] = null): Q.Promise<any> {
        return CordovaWrapper.cordovaApiOrProcess((cordova: Cordova.ICordova) => {
            return cordova.raw.build(CordovaHelper.toCordovaBuildArguments(commandData, platforms));
        }, () => ["build"].concat(CordovaHelper.toCordovaCliArguments(commandData, platforms)));
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
                return [command].concat(CordovaHelper.toCordovaCliArguments(data));
            }, { logLevel: tacoUtility.InstallLogLevel.warn, isSilent: isSilent }); // Subscribe to event listeners only if we are not in silent mode
    }

    public static emulate(commandData: commands.ICommandData, platforms: string[] = null): Q.Promise<any> {
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
        CordovaHelper.prepareCordovaConfig(cordovaParameters);
        return CordovaHelper.wrapCordovaInvocation<any>(cordovaCliVersion, (cordova: Cordova.ICordova) => {
            return cordova.raw.create(cordovaParameters.projectPath, cordovaParameters.appId, cordovaParameters.appName, cordovaParameters.cordovaConfig);
        }, tacoUtility.InstallLogLevel.taco);
    }

    public static getGlobalCordovaVersion(): Q.Promise<string> {
        return CordovaWrapper.cli(["-v"], true).then(function(output: string): string {
            return output.split("\n")[0];
        });
    }

    public static getCordovaVersion(): Q.Promise<string> {
        return projectHelper.getProjectInfo().then(function(projectInfo: projectHelper.IProjectInfo): Q.Promise<string> {
            if (projectInfo.cordovaCliVersion) {
                return Q.resolve(projectInfo.cordovaCliVersion);
            } else {
                return CordovaWrapper.getGlobalCordovaVersion();
            }
        });
    }

    public static run(commandData: commands.ICommandData, platforms: string[] = null): Q.Promise<any> {
        // ToDO: check whether plugin is installed when doing it via a cordova process
        // Test: taco run android --livereload with plugin already installed (done)
        // Test: taco run android --livereload with plugin NOT yet installed (done)
        // Test: taco run android [remote] => no plugin install
        // Test: taco run android [local] => no plugin install
        // Test: taco emulate [combinations]
        // Test: what if user doesn't use --livereload => never load its dependencies
        // ToDO: what if user installs the livereload plugin and then runs with --livereload ?
        return CordovaWrapper.cordovaApiOrProcess((cordova: Cordova.ICordova) => {
            return Q({}).then(function() {
                if (livereloadHelper.isLiveReload(commandData)) {
                    livereloadHelper.setupLiveReload(cordova, commandData);
                }
            }).then(function(): Q.Promise<any> {
                return cordova.raw.run(CordovaHelper.toCordovaRunArguments(commandData, platforms));
            });
        }, () => ["run"].concat(CordovaHelper.toCordovaCliArguments(commandData, platforms))); // check if plugin installed -> install -> process args -> run
    }

    private static isLiveReloadOrDeviceSync(commandData: commands.ICommandData) {
        return !!commandData.options["livereload"] || !!commandData.options["devicesync"];
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
        options: { logLevel?: tacoUtility.InstallLogLevel, isSilent?: boolean, captureOutput?: boolean } = {}): Q.Promise<T | string> {
        return CordovaHelper.tryInvokeCordova<T | string>(apiFunction, () => CordovaWrapper.cli(processArgs(), options.captureOutput), options);
    }
}

export = CordovaWrapper;
