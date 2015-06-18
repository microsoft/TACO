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
/// <reference path="../../typings/nopt.d.ts" />

"use strict";

import Q = require ("q");

import commandBase = require("./utils/platformPluginCommandBase");
import cordovaWrapper = require("./utils/cordovaWrapper");
import errorHelper = require("./tacoErrorHelper");
import projectHelper = require("./utils/projectHelper");
import resources = require("../resources/resourceManager");
import tacoKits = require("taco-kits");
import tacoUtility = require("taco-utils");
import TacoErrorCodes = require("./tacoErrorCodes");

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

    public checkForKitOverrides(projectInfo: projectHelper.IProjectInfo): Q.Promise<any> {
        var targets: string[] = [];
        var platformInfoToPersist: Cordova.ICordovaPlatformPuginInfo[] = [];
        var self = this;
        var saveVersion: boolean = false;
        var kitId: string = projectInfo.tacoKitId;
        var deferred = Q.defer<any>();
        self.cordovaCommandParams.targets = self.cordovaCommandParams.targets.filter(function (name: string): boolean {
            return !!name && name.length > 0;
        });

        return kitHelper.getPlatformOverridesForKit(kitId)
            .then(function (platformOverrides: TacoKits.IPlatformOverrideMetadata): Q.Promise<any> {
            console.log("Platform targets: " + self.cordovaCommandParams.targets);
            // For each of the platforms specified at command-line, check for overrides in the current kit
            return self.cordovaCommandParams.targets.reduce<Q.Promise<any>>(function (earlierPromise: Q.Promise<any>, platformName: string): Q.Promise<any> {
                return earlierPromise.then(function (): Q.Promise<any> {
                    if (platformName.length > 0) {
                        var platformInfo: Cordova.ICordovaPlatformPuginInfo = {
                            name: platformName,
                            spec: ""
                        };

                        if (!self.cliParamHasVersionOverride(platformName)) {
                            return self.configXmlHasVersionOverride(platformName, projectInfo.configXmlPath, projectInfo.cordovaCliVersion)
                                .then(function (versionOverridden: boolean): void {
                                if (!versionOverridden) {
                                    if (platformOverrides[platformName]) {
                                        if (platformOverrides[platformName].version) {
                                            platformInfo.spec = platformOverrides[platformName].version;
                                        } else if (platformOverrides[platformName].src) {
                                            platformInfo.spec = platformOverrides[platformName].src;
                                        } else {
                                            // Some one messed up the tacokit metadata file
                                            throw errorHelper.get(TacoErrorCodes.ErrorKitMetadataFileMalformed);
                                        }
                                        platformInfoToPersist.push(platformInfo);
                                    }
                                }
                                var target = platformInfo.spec.length > 0 ? platformName + "@" + platformInfo.spec : platformName;
                                targets.push(target);
                            });
                        } else {
                            targets.push(platformName);
                        }
                    }
                    return Q.resolve(targets);
                });
            }, Q({}));
        }).then(function (): Q.Promise<any> {
           self.printStatusMessage(targets, self.cordovaCommandParams.subCommand, CommandOperationStatus.InProgress);
           self.cordovaCommandParams.targets = targets;
           return Q.resolve(platformInfoToPersist);
        });
    }

    /**
     * Checks the component (platform/plugin) specification to determine if the user has attempted an override.
     * Overrides can be packageSpec@<version> / packageSpec@<git-url> / packageSpec@<filepath>
     * Do not check for overrides from kit metadata if user explicitly overrides the package on command-line
     */
    public configXmlHasVersionOverride(componentName: string, configXmlPath: string, cordovaCliVersion: string): Q.Promise<boolean> {
        var deferred = Q.defer<boolean>();
        cordovaWrapper.getEngineVersionSpec(componentName, configXmlPath, cordovaCliVersion).then(function (versionSpec: string): void {
            deferred.resolve(versionSpec !== "");
        });
        return deferred.promise;

    }

    /**
     * Checks the component (platform/plugin) specification to determine if the user has attempted an override.
     * Overrides can be packageSpec@<version> / packageSpec@<git-url> / packageSpec@<filepath>
     * Do not check for overrides from kit metadata if user explicitly overrides the package on command-line
     */
    public saveVersionOverrideInfo(infoToPersist: Cordova.ICordovaPlatformPuginInfo[], configXmlPath: string, cordovaCliVersion: string): Q.Promise<any> {
        return infoToPersist.reduce<Q.Promise<any>>(function (earlierPromise: Q.Promise<any>, info: Cordova.ICordovaPlatformPuginInfo): Q.Promise<any> {
            return earlierPromise.then(function (): Q.Promise<any> {
                return cordovaWrapper.addEngineVersionSpec(info.name, info.spec, configXmlPath, cordovaCliVersion);
            });
        }, Q({}));
    }

    /**
     * Checks the component (platform/plugin) specification to determine if the user has attempted an override.
     * Overrides can be packageSpec@<version> / packageSpec@<git-url> / packageSpec@<filepath>
     * Do not check for overrides from kit metadata if user explicitly overrides the package on command-line
     */
    public removeVersionOverrideInfo(infoToRemove: Cordova.ICordovaPlatformPuginInfo[], configXmlPath: string, cordovaCliVersion: string): Q.Promise<any> {
        return infoToRemove.reduce<Q.Promise<any>>(function (earlierPromise: Q.Promise<any>, info: Cordova.ICordovaPlatformPuginInfo): Q.Promise<any> {
            return earlierPromise.then(function (): Q.Promise<any> {
                return cordovaWrapper.removeEngineVersionSpec(info.name, configXmlPath, cordovaCliVersion);
            });
        }, Q({}));
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

    /**
     * Prints the platform addition/removal status message
     */
    public printStatusMessage(targets: string[], operation: string, status: CommandOperationStatus): void {
        // Parse the target string for platform names and print success message
        var platforms: string = "";

        if (!(targets.length == 1 && targets[0].indexOf("@") !== 0 && packageLoader.GitUriRegex.test(targets[0]) && packageLoader.FileUriRegex.test(targets[0]))) {
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
}

export = Platform;
