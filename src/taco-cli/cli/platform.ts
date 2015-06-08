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

import cordovaCommandBase = require ("./utils/cordovaCommandBase");
import tacoKits = require ("taco-kits");

import kitHelper = tacoKits.KitHelper;

/**
  * Platform
  *
  * Handles "taco platform"
  */
class Platform extends cordovaCommandBase.CordovaCommandBase {
    public name: string = "platform";

    public checkForKitOverrides(kitId: string): Q.Promise<any> {
        var targetString: string[] = [];
        var self = this;
        var saveVersion: boolean = false;
        return kitHelper.getPlatformOverridesForKit(kitId).then(function (platformOverrides: TacoKits.IPlatformOverrideMetadata): Q.Promise<any> {
            // For each of the platforms specified at command-line, check for overrides in the current kit
            self.cordovaCommandParams.targets.forEach(function (platformName: string): void {
                var suffix: string = "";
                if (platformName.length > 0) {
                    // Now, if the user has overridden the desired platform with a version number, do not look further
                    if (self.shouldCheckForOverride(platformName)) {
                        saveVersion = true;
                        if (platformOverrides[platformName]) {
                            suffix = "@" + platformOverrides[platformName].version ? platformOverrides[platformName].version : platformOverrides[platformName].src;
                        }
                    }

                    targetString.push(platformName + suffix);
                }
            });
            console.log("Target String : " + targetString);
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
