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
import errorHelper = require("./tacoErrorHelper");
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

    public checkForKitOverrides(kitId: string): Q.Promise<any> {
        var targetString: string[] = [];
        var self = this;
        var saveVersion: boolean = false;
        return kitHelper.getPluginOverridesForKit(kitId).then(function (pluginOverrides: TacoKits.IPluginOverrideMetadata): Q.Promise<any> {
            // For each of the plugins specified at command-line, check for overrides in the current kit
            self.cordovaCommandParams.targets.forEach(function (spec: string): void {
                var pluginSpec: string = spec;
                if (spec.length > 0) {
                    // Now, if the user has overridden the desired plugin with a version number or a URI (git or local), do not look further
                    if (self.shouldCheckForOverride(spec)) {
                        saveVersion = true;
                        if (pluginOverrides[spec]) {
                            if (pluginOverrides[spec].version) {
                                pluginSpec = spec + "@" + pluginOverrides[spec].version;
                            } else if (pluginOverrides[spec].src) {
                                pluginSpec = pluginOverrides[spec].src;
                            } else {
                                // Some one messed up the tacokit metadata file
                                throw errorHelper.get(TacoErrorCodes.ErrorKitMetadataFileMalformed);
                            }
                        }
                    }

                    targetString.push(pluginSpec);
                }
            });
            self.cordovaCommandParams.targets = targetString;
            self.cordovaCommandParams.downloadOptions.save = saveVersion;
            return Q.resolve({});
        });
        this.cordovaCommandParams.targets = targetString;
        return Q.resolve({});
    }

    /**
     * Prints the plugin addition/removal operation progress message
     */
    public printInProgressMessage(plugins: string, operation: string): void {
        switch (operation) {
            case "add": {
                logger.log(resources.getString("CommandPluginStatusAdding", plugins));
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
    public printSuccessMessage(plugins: string, operation: string): void {
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
            plugins = targets.join(",");
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
