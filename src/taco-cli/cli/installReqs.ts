/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />
/// <reference path="../../typings/tacoDependencyInstaller.d.ts" />
/// <reference path="../../typings/tacoUtils.d.ts" />

"use strict";

import fs = require ("fs");
import nopt = require ("nopt");
import path = require ("path");
import Q = require ("q");

import cordovaWrapper = require ("./utils/cordovaWrapper");
import dependencies = require ("taco-dependency-installer");
import TacoErrorCodes = require ("./tacoErrorCodes");
import errorHelper = require ("./tacoErrorHelper");
import resources = require ("../resources/resourceManager");
import tacoUtils = require ("taco-utils");

import commands = tacoUtils.Commands;
import DependencyInstaller = dependencies.DependencyInstaller;
import logger = tacoUtils.Logger;
import loggerHelper = tacoUtils.LoggerHelper;

/**
 * InstallDependencies
 *
 * Handles "taco install-dependencies"
 */
class InstallReqs extends commands.TacoCommandBase {
    private static KnownOptions: Nopt.FlagTypeMap = { };
    private static PlatformsFolderName: string = "platforms";
    private static PathToCheckReqs: string = path.join("cordova", "lib", "check_reqs.js");

    public info: commands.ICommandInfo;

    public run(data: commands.ICommandData): Q.Promise<any> {
        var self = this;
        var parsed: commands.ICommandData = null;

        try {
            parsed = this.parseArguments(data);
        } catch (err) {
            return Q.reject(err);
        }

        return Q({})
            .then(function (): Q.Promise<any> {
                // Get a list of the installed platforms
                var installedPlatforms: string[] = self.getInstalledPlatforms();

                if (installedPlatforms.length === 0) {
                    return Q.reject(errorHelper.get(TacoErrorCodes.CommandInstallNoPlatformsAdded));
                }

                // Get a list of the requested platforms (either what is specified by the user, or all the installed platforms if nothing is specified)
                var requestedPlatforms: string[] = parsed.remain.length > 0 ? parsed.remain : installedPlatforms.slice();   // Using slice() to clone the array

                requestedPlatforms = self.removeDuplicates(requestedPlatforms);

                // In the requested platforms, skip the ones where the current system isn't supported (for example, iOS on Windows machines)
                var skipSystemPlatforms: string[] = [];

                if (process.platform === "win32" && requestedPlatforms.indexOf("ios") > -1) {
                    self.removePlatformFromList("ios", requestedPlatforms);
                    skipSystemPlatforms.push("ios");
                }

                if (process.platform === "darwin") {
                    if (requestedPlatforms.indexOf("windows") > -1) {
                        self.removePlatformFromList("windows", requestedPlatforms);
                        skipSystemPlatforms.push("windows");
                    }

                    if (requestedPlatforms.indexOf("wp8") > -1) {
                        self.removePlatformFromList("wp8", requestedPlatforms);
                        skipSystemPlatforms.push("wp8");
                    }
                }

                if (skipSystemPlatforms.length > 0) {
                    logger.log(resources.getString("CommandInstallSkipSystem"));
                    self.printPlatformList(skipSystemPlatforms);
                    logger.logLine();
                    logger.logLine();
                }

                // In the remaining platforms, skip the ones that are not added to the project
                var skipNotInstalled: string[] = [];
                var installedAndRequested: string[] = [];

                requestedPlatforms.forEach(function (value: string): void {
                    if (installedPlatforms.indexOf(value) === -1) {
                        skipNotInstalled.push(value);
                    } else {
                        installedAndRequested.push(value);
                    }
                });

                if (skipNotInstalled.length > 0) {
                    requestedPlatforms = installedAndRequested;
                    logger.log(resources.getString("CommandInstallSkipNotAdded"));
                    self.printPlatformList(skipNotInstalled);
                    logger.logLine();
                    logger.logLine();
                }

                // In the remaining platforms, skip the ones that don't support 'cordova check_reqs'
                var skipNoReqsSupport: string[] = [];
                var requestedAndReqsSupport: string[] = [];

                requestedPlatforms.forEach(function (value: string): void {
                    if (!self.supportsCheckReqs(value)) {
                        skipNoReqsSupport.push(value);
                    } else {
                        requestedAndReqsSupport.push(value);
                    }
                });

                if (skipNoReqsSupport.length > 0) {
                    requestedPlatforms = requestedAndReqsSupport;
                    logger.log(resources.getString("CommandInstallSkipNoReqsSupport"));
                    self.printPlatformList(skipNoReqsSupport);
                    logger.logLine();
                    logger.log(resources.getString("CommandInstallNoReqsSupportHint"));
                    logger.logLine();
                    logger.logLine();
                }

                // If we don't have any remaining platforms, print message and return
                loggerHelper.logSeparatorLine();
                logger.logLine();

                if (requestedPlatforms.length === 0) {
                    logger.log(resources.getString("CommandInstallNothingToInstall"));

                    return Q({});
                }

                // Run the dependency installer on the remaining platforms
                logger.log(resources.getString("CommandInstallFinalPlatforms", requestedPlatforms.join(", ")));
                logger.logLine();

                return cordovaWrapper.requirements(requestedPlatforms)
                    .then(function (result: any): Q.Promise<any> {
                        var installer: DependencyInstaller = new DependencyInstaller();

                        return installer.run(result);
                    });
            });
    }

    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
        return true;
    }

    private parseArguments(args: commands.ICommandData): commands.ICommandData {
        return tacoUtils.ArgsHelper.parseArguments(InstallReqs.KnownOptions, {}, args.original, 0);
    }

    private getInstalledPlatforms(): string[] {
        // Assume we are at the project root
        if (!fs.existsSync(InstallReqs.PlatformsFolderName)) {
            throw errorHelper.get(TacoErrorCodes.CommandInstallNoPlatformsFolder);
        }

        var platforms: string[] = [];

        fs.readdirSync(InstallReqs.PlatformsFolderName).forEach(function (value: string): void {
            if (fs.statSync(path.join(InstallReqs.PlatformsFolderName, value)).isDirectory()) {
                // Assume that every folder under root/platforms is an installed platform
                platforms.push(value);
            }
        });

        return platforms;
    }

    private removeDuplicates(platforms: string[]): string[] {
        var seen: { [platform: string]: boolean } = {};
        var uniques: string[] = [];

        platforms.forEach(function (value: string): void {
            if (!seen[value]) {
                seen[value] = true;
                uniques.push(value);
            }
        });

        return uniques;
    }

    private removePlatformFromList(platform: string, requestedPlatforms: string[]) {
        for (var i = requestedPlatforms.length - 1; i >= 0; i--) {
            if (requestedPlatforms[i] === platform) {
                requestedPlatforms.splice(i, 1);
            }
        }
    }

    private printPlatformList(platforms: string[]): void {
        platforms.forEach(function (value: string): void {
            logger.log("    " + value);
        });
    }

    private supportsCheckReqs(platform: string): boolean {
        // For now, Cordova checks for a "check_all" method defined in <platform>/cordova/lib/check_reqs.js. Make sure to update this if Cordova changes that.
        var checkReqsPath: string = path.resolve(InstallReqs.PlatformsFolderName, platform, InstallReqs.PathToCheckReqs);
        var reqsModule: any;

        try {
            reqsModule = require(checkReqsPath);
        } catch (err) {
            return false;
        }

        if (reqsModule && typeof reqsModule.check_all === "function") {
            return true;
        }

        return false;
    }
}

export = InstallReqs;