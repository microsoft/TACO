/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/tacoUtils.d.ts" />
/// <reference path="../../typings/tacoKits.d.ts" />
/// <reference path="../../typings/node.d.ts" />

"use strict";

import Q = require ("q");

import commandBase = require ("./utils/platformPluginCommandBase");
import cordovaHelper = require("./utils/cordovaHelper");
import cordovaWrapper = require("./utils/cordovaWrapper");
import errorHelper = require ("./tacoErrorHelper");
import projectHelper = require ("./utils/projectHelper");
import resources = require ("../resources/resourceManager");
import TacoErrorCodes = require ("./tacoErrorCodes");
import tacoKits = require ("taco-kits");
import tacoUtility = require ("taco-utils");

import CommandOperationStatus = commandBase.CommandOperationStatus;
import kitHelper = tacoKits.KitHelper;
import logger = tacoUtility.Logger;
import packageLoader = tacoUtility.TacoPackageLoader;

/**
 * Platform
 * 
 * Handles "taco platform"
 */
class Platform extends commandBase.PlatformPluginCommandBase {
    public name: string = "platform";

    /**
     * Checks for kit overrides for the targets and massages the command targets 
     * parameter to be consumed by the "platform" command
     */
    public checkForKitOverrides(projectInfo: projectHelper.IProjectInfo): Q.Promise<any> {
        var targets: string[] = [];
        var platformInfoToPersist: Cordova.ICordovaPlatformPuginInfo[] = [];
        var self = this;

        var subCommand = this.cordovaCommandParams.subCommand.toLowerCase();
        if (subCommand !== "add" && subCommand === "remove" && subCommand === "rm") {
            return Q({});
        }

        return kitHelper.getPlatformOverridesForKit(projectInfo.tacoKitId)
            .then(function (platformOverrides: TacoKits.IPlatformOverrideMetadata): Q.Promise<any> {
            // For each of the platforms specified at command-line, check for overrides in the current kit
            return self.cordovaCommandParams.targets.reduce<Q.Promise<any>>(function (earlierPromise: Q.Promise<any>, platformName: string): Q.Promise<any> {
                return earlierPromise.then(function (): Q.Promise<any> {
                    var platformInfo: Cordova.ICordovaPlatformPuginInfo = { name: platformName, spec: "" };
                    // Proceed only if the version has not already been overridden on the command line 
                    // i.e, proceed only if user did not do "taco platform <subcommand> platform@<verion|src>"
                    if (!self.cliParamHasVersionOverride(platformName)) {
                        return self.configXmlHasVersionOverride(platformName, projectInfo)
                            .then(function (versionOverridden: boolean): void {                           
                            // Use kit overrides only if platform has not already been overridden in config.xml
                            if (!versionOverridden && platformOverrides[platformName]) {
                                platformInfo.spec = platformOverrides[platformName].version ? platformOverrides[platformName].version : platformOverrides[platformName].src;
                                platformInfoToPersist.push(platformInfo);
                            }

                            var target = platformInfo.spec.length > 0 ? platformName + "@" + platformInfo.spec : platformName;
                            targets.push(target);
                        });
                    } else {
                        targets.push(platformName);
                    }

                    return Q.resolve(targets);
                });
            }, Q({}));
        }).then(function (): Q.Promise<any> {              
            // Set target and print status message
           self.printStatusMessage(targets, self.cordovaCommandParams.subCommand, CommandOperationStatus.InProgress);
           self.cordovaCommandParams.targets = targets;
           return Q.resolve(platformInfoToPersist);
        });
    }

    /**
     * Checks if the platform has a version specification in config.xml of the cordova project
     */
    public configXmlHasVersionOverride(platformName: string, projectInfo: projectHelper.IProjectInfo): Q.Promise<boolean> {
        var deferred = Q.defer<boolean>();
        cordovaHelper.getEngineVersionSpec(platformName, projectInfo.configXmlPath, projectInfo.cordovaCliVersion).then(function (versionSpec: string): void {
            deferred.resolve(versionSpec !== "");
        });
        return deferred.promise;
    }

    /**
     * Edits the version override info to config.xml of the cordova project
     */
    public editVersionOverrideInfo(specs: Cordova.ICordovaPlatformPuginInfo[], projectInfo: projectHelper.IProjectInfo, add: boolean): Q.Promise<any> {
        return cordovaHelper.editConfigXml(specs, projectInfo, add, function (specs: Cordova.ICordovaPlatformPuginInfo[], parser: Cordova.cordova_lib.configparser, add: boolean): void {
            cordovaHelper.editEngineVersionSpecs(specs, parser, add);
        });
    }

    /**
     * Prints the platform addition/removal status message
     */
    public printStatusMessage(targets: string[], operation: string, status: CommandOperationStatus): void {
        // Parse the target string for platform names and print success message
        var platforms: string = "";

        if (!(targets.length === 1 && targets[0].indexOf("@") !== 0 && packageLoader.GitUriRegex.test(targets[0]) && packageLoader.FileUriRegex.test(targets[0]))) {
            platforms = targets.join(", ");
        }

        switch (status) {
            case CommandOperationStatus.InProgress: {
                this.printInProgressMessage(platforms, operation);
                break;
            }

            case CommandOperationStatus.Success: {
                this.printSuccessMessage(platforms, operation);
                break;
            }
        }
    }

    /**
     * Prints the platform addition/removal operation progress message
     */
    private printInProgressMessage(platforms: string, operation: string): void {
       switch (operation) {
            case "add": {
               logger.log(resources.getString("CommandPlatformStatusAdding", platforms));
               break;
            }

            case "remove":
            case "rm": {
                logger.log(resources.getString("CommandPlatformStatusRemoving", platforms));
                break;
            }

            case "update": {
                logger.log(resources.getString("CommandPlatformStatusUpdating", platforms));
                break;
            }
        }
    }

    /**
     * Prints the platform addition/removal operation success message
     */
    private printSuccessMessage(platforms: string, operation: string): void {
        switch (operation) {
            case "add": {
                logger.log(resources.getString("CommandPlatformStatusAdded", platforms));
                break;
            }

            case "remove":
            case "rm": {
                logger.log(resources.getString("CommandPlatformStatusRemoved", platforms));
                break;
            }

            case "update": {
                logger.log(resources.getString("CommandPlatformStatusUpdated", platforms));
                break;
            }
        }
    }
}

export = Platform;
