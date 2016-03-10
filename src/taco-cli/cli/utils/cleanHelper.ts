// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/Q.d.ts" />
/// <reference path="../../../typings/rimraf.d.ts" />
/// <reference path="../../../typings/tacoUtils.d.ts" />

"use strict";

import fs = require("fs");
import path = require("path");
import Q = require("q");
import rimraf = require("rimraf");

import errorHelper = require("../tacoErrorHelper");
import PlatformHelper = require("./platformHelper");
import resources = require("../../resources/resourceManager");
import TacoErrorCodes = require("../tacoErrorCodes");
import tacoUtility = require("taco-utils");

import commands = tacoUtility.Commands;
import logger = tacoUtility.Logger;
import UtilHelper = tacoUtility.UtilHelper;

export class CleanHelper {
    public static cleanPlatforms(platforms: PlatformHelper.IPlatformWithLocation[], commandData: commands.ICommandData): Q.Promise<any> {
        return Q.all(platforms.map((platform: PlatformHelper.IPlatformWithLocation): Q.Promise<any> => {
            return CleanHelper.cleanPlatform(platform, commandData);
        }));
    }

    public static cleanPlatform(platform: PlatformHelper.IPlatformWithLocation, commandData: commands.ICommandData): Q.Promise<any> {
        switch (platform.location) {
            case PlatformHelper.BuildLocationType.Local:
                // To clean locally, try and run the clean script
                var cleanScriptPath: string = path.join("platforms", platform.platform, "cordova", "clean");
                if (fs.existsSync(cleanScriptPath)) {
                    return Q.denodeify(UtilHelper.loggedExec)(cleanScriptPath).fail(function (err: any): void {
                        // If we can't run the script, then show a warning but continue
                        logger.logWarning(err.toString());
                    });
                }
                break;
            case PlatformHelper.BuildLocationType.Remote:
                var releaseString: string = "release";
                var debugString: string = "debug";
                var configurations: string[] = [];

                if (commandData.options[releaseString]) {
                    configurations.push(releaseString);
                }

                if (commandData.options[debugString]) {
                    configurations.push(debugString);
                }

                if (!configurations.length) {
                    configurations = [releaseString, debugString];
                }

                var remotePlatform: string = path.resolve(".", "remote", platform.platform);

                return tacoUtility.PromisesUtils.chain(configurations, (configuration: string) => {
                    var remotePlatformConfig: string = path.join(remotePlatform, configuration);

                    if (fs.existsSync(remotePlatformConfig)) {
                        logger.log(resources.getString("CleaningRemoteResources", platform.platform, configuration));
                        rimraf.sync(remotePlatformConfig);
                    }

                    return Q({});
                });
            default:
                throw errorHelper.get(TacoErrorCodes.CommandBuildInvalidPlatformLocation, platform.platform);
        }

        return Q({});
    }
}