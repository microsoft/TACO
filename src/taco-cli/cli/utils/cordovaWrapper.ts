/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/Q.d.ts" />
/// <reference path="../../../typings/cordovaExtensions.d.ts" />

"use strict";

import child_process = require ("child_process");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import util = require ("util");

import cordovaHelper = require ("./cordovaHelper");
import projectHelper = require ("./projectHelper");
import resources = require ("../../resources/resourceManager");
import TacoErrorCodes = require ("../tacoErrorCodes");
import errorHelper = require ("../tacoErrorHelper");
import tacoUtility = require ("taco-utils");

import commands = tacoUtility.Commands;
import packageLoader = tacoUtility.TacoPackageLoader;
import tacoProjectHelper = projectHelper.TacoProjectHelper;

class CordovaWrapper {
    private static CordovaCommandName: string = os.platform() === "win32" ? "cordova.cmd" : "cordova";
    private static CordovaNpmPackageName: string = "cordova";

    public static cli(args: string[]): Q.Promise<any> {
        var deferred = Q.defer();
        var proc = child_process.spawn(CordovaWrapper.CordovaCommandName, args, { stdio: "inherit" });
        proc.on("error", function (err: any): void {  
            // ENOENT error thrown if no Cordova.cmd is found
            var tacoError = (err.code === "ENOENT") ?
                errorHelper.get(TacoErrorCodes.CordovaCmdNotFound) :
                errorHelper.wrap(TacoErrorCodes.CordovaCommandFailedWithError, err, args.join(" "));
            deferred.reject(tacoError);
        });
        proc.on("close", function (code: number): void {
            if (code) {
                deferred.reject(errorHelper.get(TacoErrorCodes.CordovaCommandFailed, code, args.join(" ")));
            } else {
                deferred.resolve({});
            }
        });
        return deferred.promise;
    }

    public static build(platform: string, commandData: commands.ICommandData): Q.Promise<any> {
        return tacoProjectHelper.getProjectInfo().then(function (projectInfo: projectHelper.IProjectInfo): Q.Promise<any> {
            if (projectInfo.cordovaCliVersion) {
                return packageLoader.lazyRequire(CordovaWrapper.CordovaNpmPackageName, CordovaWrapper.CordovaNpmPackageName + "@" + projectInfo.cordovaCliVersion, tacoUtility.InstallLogLevel.taco)
                    .then(function (cordova: Cordova.ICordova): Q.Promise<any> {
                        return cordova.raw.build(cordovaHelper.toCordovaBuildArguments(platform, commandData));
                });
            } else {
                return CordovaWrapper.cli(["build", platform].concat(cordovaHelper.toCordovaCliArguments(commandData)));
            }
        });
    }

    public static run(platform: string, commandData: commands.ICommandData): Q.Promise<any> {
        return tacoProjectHelper.getProjectInfo().then(function (projectInfo: projectHelper.IProjectInfo): Q.Promise<any> {
            if (projectInfo.cordovaCliVersion) {
                return packageLoader.lazyRequire(CordovaWrapper.CordovaNpmPackageName, CordovaWrapper.CordovaNpmPackageName + "@" + projectInfo.cordovaCliVersion, tacoUtility.InstallLogLevel.taco)
                    .then(function (cordova: Cordova.ICordova): Q.Promise<any> {
                    return cordova.raw.run(cordovaHelper.toCordovaRunArguments(platform, commandData));
                });
            } else {
                return CordovaWrapper.cli(["run", platform].concat(cordovaHelper.toCordovaCliArguments(commandData)));
            }
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
    public static create(cordovaCliVersion: string, cordovaParameters: cordovaHelper.ICordovaCreateParameters): Q.Promise<any> {
        return packageLoader.lazyRequire(CordovaWrapper.CordovaNpmPackageName, CordovaWrapper.CordovaNpmPackageName + "@" + cordovaCliVersion, tacoUtility.InstallLogLevel.taco)
            .then(function (cordova: Cordova.ICordova): Q.Promise<any> {
                cordovaHelper.prepareCordovaConfig(cordovaParameters);

                return cordova.raw.create(cordovaParameters.projectPath, cordovaParameters.appId, cordovaParameters.appName, cordovaParameters.cordovaConfig);
            });
    }
    
    /**
     * Static method to invoke a cordova command. Used to invole the 'platform' or 'plugin' command
     *
     * @param {string} The name of the cordova command to be invoked
     * @param {string} The version of the cordova CLI to use
     * @param {ICordovaCommandParameters} The cordova command parameters
     *
     * @return {Q.Promise<any>} An empty promise
     */
    public static invokeCommand(command: string, cordovaCliVersion: string, platformCmdParameters: cordovaHelper.ICordovaCommandParameters): Q.Promise<any> {
        return packageLoader.lazyRequire(CordovaWrapper.CordovaNpmPackageName, CordovaWrapper.CordovaNpmPackageName + "@" + cordovaCliVersion)
            .then(function (cordova: Cordova.ICordova): Q.Promise<any> {
                if (command === "platform") {
                    return cordova.raw.platform(platformCmdParameters.subCommand, platformCmdParameters.targets.join(" "), platformCmdParameters.downloadOptions);
                } else if (command === "plugin") {
                    return cordova.raw.plugin(platformCmdParameters.subCommand, platformCmdParameters.targets.join(" "), platformCmdParameters.downloadOptions);
                } else {
                    return Q.reject(errorHelper.get(TacoErrorCodes.CordovaCmdNotFound));
                }
        });
    }
}

export = CordovaWrapper;
