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
import cordovaHelper = require ("./utils/cordovaHelper");
import cordovaWrapper = require ("./utils/cordovaWrapper");
import errorHelper = require ("./tacoErrorHelper");
import kitHelper = require ("./utils/kitHelper");
import projectHelper = require ("./utils/projectHelper");
import resources = require ("../resources/resourceManager");
import TacoErrorCodes = require ("./tacoErrorCodes");
import tacoKits = require ("taco-kits");
import tacoUtility = require ("taco-utils");

import CommandOperationStatus = commandBase.CommandOperationStatus;
import logger = tacoUtility.Logger;
import packageLoader = tacoUtility.TacoPackageLoader;
import LoggerHelper = tacoUtility.LoggerHelper;

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
        var self: Plugin = this;
        var pluginInfoToPersist: Cordova.ICordovaPlatformPluginInfo[] = [];

        var subCommand: string = this.cordovaCommandParams.subCommand;

        if (subCommand === "rm") {
            subCommand = "remove";
        }

        if (subCommand !== "add" && subCommand !== "remove") {
            return Q({});
        }

        return kitHelper.getPluginOverridesForKit(projectInfo.tacoKitId)
            .then(function (pluginOverrides: TacoKits.IPluginOverrideMetadata): Q.Promise<any> {
            // For each of the plugins specified at command-line, check for overrides in the current kit
            return self.cordovaCommandParams.targets.reduce<Q.Promise<any>>(function (earlierPromise: Q.Promise<any>, pluginName: string): Q.Promise<any> {
                return earlierPromise.then(function (): Q.Promise<any> {
                    var pluginInfo: Cordova.ICordovaPlatformPluginInfo = { name: pluginName, spec: "", pluginVariables: [] };
                    // Proceed only if the version has not already been overridden on
                    // command line i.e, proceed only if user did not add plugin@<verion|src>
                    if (!self.cliParamHasVersionOverride(pluginName)) {
                        return self.configXmlHasVersionOverride(pluginName, projectInfo)
                            .then(function (versionOverridden: boolean): void {
                            var target: string = pluginName;
                            // Use kit overrides only if plugin has not already been overridden in config.xml
                            if (!versionOverridden && pluginOverrides && pluginOverrides[pluginName]) {
                                var pluginOverrideData: TacoKits.IPluginOverrideInfo = pluginOverrides[pluginName];
                                if (pluginOverrideData.version) {
                                    pluginInfo.spec = pluginOverrideData.version;
                                    target = pluginName + "@" + pluginInfo.spec;
                                } else if (pluginOverrideData.src) {
                                    target = pluginInfo.spec = pluginOverrideData.src;
                                }

                                // Push the target to list of values to be persisted in config.xml
                                pluginInfoToPersist.push(pluginInfo);
                                if (pluginOverrideData["supported-platforms"]) {
                                    self.printSupportedPlatformsMessage(target, pluginOverrideData["supported-platforms"], self.cordovaCommandParams.subCommand);
                                }
                            } else if (versionOverridden && subCommand === "remove") {
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
    public configXmlHasVersionOverride(pluginName: string, projectInfo: projectHelper.IProjectInfo): Q.Promise<boolean> {
        var deferred: Q.Deferred<boolean> = Q.defer<boolean>();
        cordovaHelper.getPluginVersionSpec(pluginName, projectInfo.configXmlPath, projectInfo.cordovaCliVersion).then(function (versionSpec: string): void {
            deferred.resolve(versionSpec !== "");
        });
        return deferred.promise;
    }

    /**
     * Edits the version override info to config.xml of the cordova project
     */
    public editVersionOverrideInfo(specs: Cordova.ICordovaPlatformPluginInfo[], projectInfo: projectHelper.IProjectInfo, add: boolean): Q.Promise<any> {
        return cordovaHelper.editConfigXml(projectInfo, function (parser: Cordova.cordova_lib.configparser): void {
            cordovaHelper.editPluginVersionSpecs(specs, parser, add);
        });
    }

    /**
     * Prints the supported platforms information regarding a plugin
     */
    public printSupportedPlatformsMessage(pluginId: string, supportedPlatforms: string, operation: string): void {
        if (operation === "add") {
            logger.log(resources.getString("CommandPluginTestedPlatforms", pluginId, supportedPlatforms));
        }
    }

    /**
     * Prints the plugin addition/removal status message
     */
    public printStatusMessage(targets: string[], operation: string, status: CommandOperationStatus): void {
        // Parse the target string for plugin names and print success message
        var plugins: string = "";

        if (!(targets.length === 1 && targets[0].indexOf("@") !== 0 && packageLoader.GIT_URI_REGEX.test(targets[0]) && packageLoader.FILE_URI_REGEX.test(targets[0]))) {
            plugins = targets.join(", ");
        }

        switch (status) {
            case CommandOperationStatus.InProgress: {
                this.printInProgressMessage(plugins, operation);
            }
            break;

            case CommandOperationStatus.Success: {
                this.printSuccessMessage(plugins, operation);
            }
            break;
        }
    }

    /**
     * Prints the plugin addition/removal operation progress message
     */
    private printInProgressMessage(plugins: string, operation: string): void {
        switch (operation) {
            case "add": {
                logger.log(resources.getString("CommandPluginStatusAdding", plugins));
            }
            break;

            case "remove":
            case "rm": {
                logger.log(resources.getString("CommandPluginStatusRemoving", plugins));
            }
            break;

            case "update": {
                logger.log(resources.getString("CommandPluginStatusUpdating", plugins));
            }
            break;
        }
    }

    /**
     * Prints the plugin addition/removal operation success message
     */
    private printSuccessMessage(plugins: string, operation: string): void {
        switch (operation) {
            case "add": {
                logger.log(resources.getString("CommandPluginWithIdStatusAdded", plugins));

                // Print the onboarding experience
                logger.log(resources.getString("OnboardingExperienceTitle"));
                LoggerHelper.logList(["HowToUseCommandInstallReqsPlugin",
                    "HowToUseCommandSetupRemote",
                    "HowToUseCommandBuildPlatform",
                    "HowToUseCommandEmulatePlatform",
                    "HowToUseCommandRunPlatform"].map((msg: string) => resources.getString(msg)));

                ["",
                    "HowToUseCommandHelp",
                    "HowToUseCommandDocs"].forEach((msg: string) => logger.log(resources.getString(msg)));
            }
            break;

            case "remove":
            case "rm": {
                logger.log(resources.getString("CommandPluginStatusRemoved", plugins));
            }
            break;

            case "update": {
                logger.log(resources.getString("CommandPluginStatusUpdated", plugins));
            }
            break;
        }
    }
}

export = Plugin;
