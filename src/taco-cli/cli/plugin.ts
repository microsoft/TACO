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

import fs = require ("fs");
import nopt = require ("nopt");
import path = require ("path");
import Q = require ("q");

import cordovaCommandBase = require ("./utils/cordovaCommandBase");
import cordovaHelper = require ("./utils/cordovaHelper");
import cordovaWrapper = require ("./utils/cordovaWrapper");
import projectHelper = require ("./utils/projectHelper");
import resources = require ("../resources/resourceManager");
import tacoKits = require ("taco-kits");
import TacoErrorCodes = require ("./tacoErrorCodes");
import errorHelper = require ("./tacoErrorHelper");
import tacoUtility = require ("taco-utils");
import templateManager = require ("./utils/templateManager");

import commands = tacoUtility.Commands;
import kitHelper = tacoKits.KitHelper;
import logger = tacoUtility.Logger;
import tacoProjectHelper = projectHelper.TacoProjectHelper;
import utils = tacoUtility.UtilHelper;

/*
 * Plugin
 *
 * Handles "taco plugin"
 */
class Plugin extends cordovaCommandBase.CordovaCommandBase {
    public name: string = "plugin";
    public checkForKitOverrides(kitId: string): Q.Promise<any> {
        var targetString: string[] = [];
        var self = this;
        var saveVersion: boolean = false;
        return kitHelper.getPluginOverridesForKit(kitId).then(function (pluginOverrides: TacoKits.IPluginOverrideMetadata): Q.Promise<any> {
            // For each of the plugins specified at command-line, check for overrides in the current kit
            self.cordovaCommandParams.targets.forEach(function (pluginName: string): void {
                var suffix: string = "";
                if (pluginName.length > 0) {
                    // Now, if the user has overridden the desired plugin with a version number, do not look further
                    if (self.shouldCheckForOverride(pluginName)) {
                        saveVersion = true;
                        if (pluginOverrides[pluginName]) {
                            suffix = "@" + pluginOverrides[pluginName].version ? pluginOverrides[pluginName].version : pluginOverrides[pluginName].src;
                        }
                    }

                    targetString.push(pluginName + suffix);
                }
            });
            self.cordovaCommandParams.targets = targetString;
            self.cordovaCommandParams.downloadOptions.save = saveVersion;
            return Q.resolve({});
        });
        this.cordovaCommandParams.targets = targetString;
        return Q.resolve({});
    }
}

export = Plugin;
