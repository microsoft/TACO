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

import Q = require("q");

import commandBase = require("./utils/platformPluginCommandBase");
import cordovaWrapper = require("./utils/cordovaWrapper");
import errorHelper = require("./tacoErrorHelper");
import projectHelper = require("./utils/projectHelper");
import resources = require("../resources/resourceManager");
import tacoKits = require("taco-kits");
import tacoUtility = require("taco-utils");
import TacoErrorCodes = require("./tacoErrorCodes");

import kitHelper = tacoKits.KitHelper;
import logger = tacoUtility.Logger;
import packageLoader = tacoUtility.TacoPackageLoader;
import CommandOperationStatus = commandBase.CommandOperationStatus;

/**
  * Plugin
  *
  * Handles "taco plugin"
  */
class Plugin extends commandBase.PlatformPluginCommandBase {
    public name: string = "plugin";

    public checkForKitOverrides(projectInfo: projectHelper.IProjectInfo): Q.Promise<any> {
        var targets: string[] = [];
        var self = this;
        var kitId: string = projectInfo.tacoKitId;
        var pluginInfoToPersist: Cordova.ICordovaPlatformPuginInfo[] = [];
        kitHelper.getPluginOverridesForKit(kitId).then(function (pluginOverrides: TacoKits.IPluginOverrideMetadata): void {

            self.cordovaCommandParams.targets.forEach(function (pluginName: string): void {
                if (pluginName.length > 0) {
                    var pluginInfo: Cordova.ICordovaPlatformPuginInfo = {
                        name: pluginName,
                        spec: ""
                    };

                    if (!self.cliParamHasVersionOverride(pluginName)) {
                        self.configXmlHasVersionOverride(pluginName, projectInfo.configXmlPath, projectInfo.cordovaCliVersion)
                            .then(function (versionOverridden: boolean): void {
                            if (!versionOverridden) {
                                if (pluginOverrides[pluginName]) {
                                    if (pluginOverrides[pluginName].version) {
                                        pluginInfo.spec = pluginName + "@" + pluginOverrides[pluginName].version;
                                    } else if (pluginOverrides[pluginName].src) {
                                        pluginInfo.spec = pluginOverrides[pluginName].src;
                                    } else {
                                        // Some one messed up the tacokit metadata file
                                        throw errorHelper.get(TacoErrorCodes.ErrorKitMetadataFileMalformed);
                                    }
                                    pluginInfoToPersist.push(pluginInfo);
                                }
                            }
                            var target: string= pluginInfo.spec.length > 0 ? pluginName + "@" + pluginInfo.spec : pluginName;
                            targets.push(target);
                        });
                    } else {
                        targets.push(pluginName);
                    }
                    targets.push(pluginName + "@" + pluginInfo.spec);
                }
            });
        });

        this.printStatusMessage(targets, self.cordovaCommandParams.subCommand, CommandOperationStatus.InProgress);
        this.cordovaCommandParams.targets = targets;
        return Q.resolve(pluginInfoToPersist);
    }

    /**
     * Checks the component (platform/plugin) specification to determine if the user has attempted an override.
     * Overrides can be packageSpec@<version> / packageSpec@<git-url> / packageSpec@<filepath>
     * Do not check for overrides from kit metadata if user explicitly overrides the package on command-line
     */
    public configXmlHasVersionOverride(componentName: string, configXmlPath: string, cordovaCliVersion: string): Q.Promise<boolean> {
        var deferred = Q.defer<boolean>();
        cordovaWrapper.getPluginVersionSpec(componentName, configXmlPath, cordovaCliVersion).then(function (versionSpec: string): void {
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
                return cordovaWrapper.addPluginVersionSpec(info, configXmlPath, cordovaCliVersion);
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
                logger.log(resources.getString("CommandPlatformStatusAdded", plugins));
                break;
            }
            case "remove":
            case "rm": {
                logger.log(resources.getString("CommandPlatformStatusRemoved", plugins));
                break;
            }
            case "update": {
                logger.log(resources.getString("CommandPlatformStatusUpdated", plugins));
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
