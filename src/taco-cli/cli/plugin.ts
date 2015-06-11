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
import tacoKits = require("taco-kits");
import TacoErrorCodes = require("./tacoErrorCodes");
import errorHelper = require("./tacoErrorHelper");

import kitHelper = tacoKits.KitHelper;

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
}

export = Plugin;
