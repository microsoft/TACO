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
import errorHelper = require("./tacoErrorHelper");
import resources = require("../resources/resourceManager");
import tacoKits = require("taco-kits");
import tacoUtility = require("taco-utils");
import TacoErrorCodes = require("./tacoErrorCodes");

import CommandOperationStatus = commandBase.CommandOperationStatus;
import kitHelper = tacoKits.KitHelper;
import logger = tacoUtility.Logger;
import packageLoader = tacoUtility.TacoPackageLoader;
import PackageSpecType = TacoUtility.PackageSpecType;

/**
  * Platform
  *
  * Handles "taco platform"
  */
class Platform extends commandBase.PlatformPluginCommandBase {
    public name: string = "platform";

    public checkForKitOverrides(kitId: string): Q.Promise<any> {
        var targets: string[] = [];
        var self = this;
        var saveVersion: boolean = false;
        return kitHelper.getPlatformOverridesForKit(kitId).then(function (platformOverrides: TacoKits.IPlatformOverrideMetadata): Q.Promise<any> {
            // For each of the platforms specified at command-line, check for overrides in the current kit
            console.log("Platform targets: " + self.cordovaCommandParams.targets);
            self.cordovaCommandParams.targets.forEach(function (platformName: string): void {
                if (platformName.length > 0) {
                    var platformSpec: string = "";
                    var specType: PackageSpecType = PackageSpecType.Error;
                    // Now, if the user has overridden the desired platform with a version number, do not look further
                    if (self.shouldCheckForOverride(platformName)) {
                        saveVersion = true; 
                        if (platformOverrides[platformName]) {
                            if (platformOverrides[platformName].version) {
                                platformSpec = platformOverrides[platformName].version;
                                specType = PackageSpecType.Version;
                            } else if (platformOverrides[platformName].src) {
                                platformSpec = platformOverrides[platformName].src;
                                specType = PackageSpecType.Uri;
                            } else {
                                // Some one messed up the tacokit metadata file
                                throw errorHelper.get(TacoErrorCodes.ErrorKitMetadataFileMalformed);
                            }

                            
                            platformSpec = platformName + "@" + platformSpec;
                        }
                    }
                    targets.push(platformSpec);
                }
            });
            this.printStatusMessage(targets, self.cordovaCommandParams.subCommand, CommandOperationStatus.InProgress);
            self.cordovaCommandParams.targets = targets;


            // Do not overwrite the save preference, if the user explicitly passed the --save flag on command-line
            if (!self.cordovaCommandParams.downloadOptions.save) {
                self.cordovaCommandParams.downloadOptions.save = saveVersion;
            }

            return Q.resolve({});
        });
        this.cordovaCommandParams.targets = targets;
        return Q.resolve({});
    }

    /**
     * Prints the platform addition/removal operation progress message
     */
    public printInProgressMessage(platforms: string, operation: string): void {
       switch (operation) {
            case "add": {
                logger.log(resources.getString("CommandPlatformStatusAdding", platforms));
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
    public printSuccessMessage(platforms: string, operation: string): void {
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
            platforms = targets.join(",");
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
