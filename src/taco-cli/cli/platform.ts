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
import tacoKits = require("taco-kits");
import tacoUtility = require("taco-utils");
import TacoErrorCodes = require("./tacoErrorCodes");

import packageLoader = tacoUtility.TacoPackageLoader;
import kitHelper = tacoKits.KitHelper;

/**
  * Platform
  *
  * Handles "taco platform"
  */
class Platform extends commandBase.PlatformPluginCommandBase {
    public name: string = "platform";

    public checkForKitOverrides(kitId: string): Q.Promise<any> {
        var targetString: string[] = [];
        var self = this;
        var saveVersion: boolean = false;
        return kitHelper.getPlatformOverridesForKit(kitId).then(function (platformOverrides: TacoKits.IPlatformOverrideMetadata): Q.Promise<any> {
            // For each of the platforms specified at command-line, check for overrides in the current kit
            console.log("Platform targets: " + self.cordovaCommandParams.targets);
            self.cordovaCommandParams.targets.forEach(function (platformName: string): void {
                if (platformName.length > 0) {
                    var platformSpec: string = platformName;
                    // Now, if the user has overridden the desired platform with a version number, do not look further
                    if (self.shouldCheckForOverride(platformName)) {
                        saveVersion = true;
                        if (platformOverrides[platformName]) {
                            if (platformOverrides[platformName].version) {
                                platformSpec = platformSpec + "@" + platformOverrides[platformName].version;
                                //logger.log(resources.getString("CommandCreateSuccessProjectTemplate", templateDisplayName, projectFullPath));
                            } else if (platformOverrides[platformName].src) {
                                platformSpec = platformSpec + "@" + platformOverrides[platformName].src;
                                //logger.log(resources.getString("CommandCreateSuccessProjectTemplate", templateDisplayName, projectFullPath));
                            } else {
                                // Some one messed up the tacokit metadata file
                                throw errorHelper.get(TacoErrorCodes.ErrorKitMetadataFileMalformed);
                            }
                            platformSpec = platformSpec + "@" + (platformOverrides[platformName].version ? platformOverrides[platformName].version : platformOverrides[platformName].src);
                        }
                    }

                    targetString.push(platformSpec);
                }
            });
            self.cordovaCommandParams.targets = targetString;

            // Do not overwrite the save preference, if the user explicitly passed the --save flag on command-line
            if (!self.cordovaCommandParams.downloadOptions.save) {
                self.cordovaCommandParams.downloadOptions.save = saveVersion;
            }

            return Q.resolve({});
        });
        this.cordovaCommandParams.targets = targetString;
        return Q.resolve({});
    }
}

export = Platform;
