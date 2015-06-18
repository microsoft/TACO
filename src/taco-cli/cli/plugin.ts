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

import Q = require("q");

import commandBase = require("./utils/platformPluginCommandBase");
import cordovaWrapper = require("./utils/cordovaWrapper");
import errorHelper = require("./tacoErrorHelper");
import projectHelper = require("./utils/projectHelper");
import resources = require("../resources/resourceManager");
import TacoErrorCodes = require("./tacoErrorCodes");
import tacoKits = require("taco-kits");
import tacoUtility = require("taco-utils");

import CommandOperationStatus = commandBase.CommandOperationStatus;
import kitHelper = tacoKits.KitHelper;
import logger = tacoUtility.Logger;
import packageLoader = tacoUtility.TacoPackageLoader;

/**
  * Plugin
  *
  * Handles "taco plugin"
  */
class Plugin extends commandBase.PlatformPluginCommandBase {
    public name: string = "plugin";

     /**
     * Checks for kit overrides for the targets and massages the command targets 
     * parameter to be consumed by the "plugin" command
     */
    public checkForKitOverrides(projectInfo: projectHelper.IProjectInfo): Q.Promise<any> {
        var targets: string[] = [];
        var self = this;
        var pluginInfoToPersist: Cordova.ICordovaPlatformPuginInfo[] = [];

        return kitHelper.getPluginOverridesForKit(projectInfo.tacoKitId)
            .then(function (pluginOverrides: TacoKits.IPluginOverrideMetadata): Q.Promise<any> {
            // For each of the plugins specified at command-line, check for overrides in the current kit
            return self.cordovaCommandParams.targets.reduce<Q.Promise<any>>(function (earlierPromise: Q.Promise<any>, pluginName: string): Q.Promise<any> {
                return earlierPromise.then(function (): Q.Promise<any> {
                    var pluginInfo: Cordova.ICordovaPlatformPuginInfo = { name: pluginName, spec: "", pluginVariables: [] };          
                    // Proceed only if the version has not already been overridden on
                    // command line i.e, proceed only if user did not add plugin@<verion|src>
                    if (!self.cliParamHasVersionOverride(pluginName)) {
                        return self.configXmlHasVersionOverride(pluginName, projectInfo.configXmlPath, projectInfo.cordovaCliVersion)
                            .then(function (versionOverridden: boolean): void {
                            var target: string = pluginName;
                            // Use kit overrides only if plugin has not already been overridden in config.xml
                            if (!versionOverridden && pluginOverrides[pluginName]) {
                                if (pluginOverrides[pluginName].version) {
                                    pluginInfo.spec = pluginOverrides[pluginName].version;
                                    target = pluginName + "@" + pluginInfo.spec;
                                } else if (pluginOverrides[pluginName].src) {
                                    target = pluginInfo.spec = pluginOverrides[pluginName].src;
                                }
                                // Push the target to list of values to be persisted in config.xml
                                pluginInfoToPersist.push(pluginInfo);
                            }
                            targets.push(target);
                        });
                    } else {
                        targets.push(pluginName);
                    }
                    return Q.resolve(targets);
                });
            }, Q({}));
        }).then(function (): Q.Promise<any> {
            // Set target and print status message
            self.printStatusMessage(targets, self.cordovaCommandParams.subCommand, CommandOperationStatus.InProgress);
            self.cordovaCommandParams.targets = targets;
            return Q.resolve(pluginInfoToPersist);
        });
    }

    /**
     * Checks if the plugin has a version specification in config.xml of the cordova project
     */
    public configXmlHasVersionOverride(pluginName: string, configXmlPath: string, cordovaCliVersion: string): Q.Promise<boolean> {
        var deferred = Q.defer<boolean>();
        cordovaWrapper.getPluginVersionSpec(pluginName, configXmlPath, cordovaCliVersion).then(function (versionSpec: string): void {
            deferred.resolve(versionSpec !== "");
        });
        return deferred.promise;

    }

    /**
     * Saves the version override info to config.xml of the cordova project
     */
    public saveVersionOverrideInfo(infoToPersist: Cordova.ICordovaPlatformPuginInfo[], configXmlPath: string, cordovaCliVersion: string): Q.Promise<any> {
        return infoToPersist.reduce<Q.Promise<any>>(function (earlierPromise: Q.Promise<any>, info: Cordova.ICordovaPlatformPuginInfo): Q.Promise<any> {
            return earlierPromise.then(function (): Q.Promise<any> {
                return cordovaWrapper.addPluginVersionSpec(info, configXmlPath, cordovaCliVersion);
            });
        }, Q({}));
    }

    /**
     * Removes the version override info of the plugin from config.xml of the cordova project
     */
    public removeVersionOverrideInfo(infoToRemove: Cordova.ICordovaPlatformPuginInfo[], configXmlPath: string, cordovaCliVersion: string): Q.Promise<any> {
        return infoToRemove.reduce<Q.Promise<any>>(function (earlierPromise: Q.Promise<any>, info: Cordova.ICordovaPlatformPuginInfo): Q.Promise<any> {
            return earlierPromise.then(function (): Q.Promise<any> {
                return cordovaWrapper.removePluginVersionSpec(info.name, configXmlPath, cordovaCliVersion);
            });
        }, Q({}));
    }

    /**
     * Prints the plugin addition/removal operation progress message
     */
    private printInProgressMessage(plugins: string, operation: string): void {
        switch (operation) {
            case "add": {
                logger.log(resources.getString("CommandPluginStatusAdding", plugins));
                break;
            }
            case "remove":
            case "rm": {
                logger.log(resources.getString("CommandPluginStatusRemoving", plugins));
                break;
            }
            case "update": {
                logger.log(resources.getString("CommandPluginStatusUpdating", plugins));
                break;
            }
        }
    }

    /**
     * Prints the plugin addition/removal operation success message
     */
    private printSuccessMessage(plugins: string, operation: string): void {
        switch (operation) {
            case "add": {
                logger.log(resources.getString("CommandPluginStatusAdded", plugins));
                break;
            }
            case "remove":
            case "rm": {
                logger.log(resources.getString("CommandPluginStatusRemoved", plugins));
                break;
            }
            case "update": {
                logger.log(resources.getString("CommandPluginStatusUpdated", plugins));
                break;
            }
        }
    }

    /**
     * Prints the plugin addition/removal status message
     */
    public printStatusMessage(targets: string[], operation: string, status: CommandOperationStatus): void {
        // Parse the target string for plugin names and print success message
        var plugins: string = "";

        if (!(targets.length == 1 && targets[0].indexOf("@") !== 0 && packageLoader.GitUriRegex.test(targets[0]) && packageLoader.FileUriRegex.test(targets[0]))) {
            plugins = targets.join(", ");
        }

        switch (status) {
            case CommandOperationStatus.InProgress: {
                this.printInProgressMessage(plugins, operation);
                break;
            }
            case CommandOperationStatus.Success: {
                this.printSuccessMessage(plugins, operation);
                break;
            }
        }
    }
}

export = Plugin;
