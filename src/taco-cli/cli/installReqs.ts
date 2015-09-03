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

import buildTelemetryHelper = require ("./utils/buildTelemetryHelper");
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
    private static MinPlatformVersions: { [id: string]: string } = {
        ios: "3.9.0",
        android: "4.1.0",
        windows: "4.1.0"
    };

    public info: commands.ICommandInfo;

    public run(data: commands.ICommandData): Q.Promise<TacoUtility.ICommandTelemetryProperties> {
        return tacoUtils.TelemetryHelper.generate("InstallReqs", telemetry => {
            var self = this;
            var parsed: commands.ICommandData = null;

            try {
                parsed = InstallReqs.parseArguments(data);
            } catch (err) {
                return Q.reject(err);
            }

            return Q({})
                .then(function (): Q.Promise<any> {
                    logger.logLine();

                    // Get a list of the installed platforms
                    var installedPlatforms: string[] = InstallReqs.getInstalledPlatforms();

                    if (installedPlatforms.length === 0) {
                        return Q.reject(errorHelper.get(TacoErrorCodes.CommandInstallNoPlatformsAdded));
                    }

                    telemetry
                        .addWithPiiEvaluator("requestedPlatformsViaCommandLine", parsed.remain, buildTelemetryHelper.getIsPlatformPii())
                        .addWithPiiEvaluator("installedPlatforms", installedPlatforms, buildTelemetryHelper.getIsPlatformPii());

                    // Get a list of the requested platforms (either what is specified by the user, or all the installed platforms if nothing is specified)
                    var requestedPlatforms: string[] = parsed.remain.length > 0 ? parsed.remain : installedPlatforms.slice();   // Using slice() to clone the array

                    requestedPlatforms = InstallReqs.removeDuplicates(requestedPlatforms);

                    // From the requested platforms, skip the ones where the current system isn't supported (for example, iOS on Windows machines)
                    requestedPlatforms = InstallReqs.skipSystemPlatforms(requestedPlatforms);

                    // From the remaining platforms, skip the ones that are not added to the project
                    requestedPlatforms = InstallReqs.skipNotInstalled(requestedPlatforms, installedPlatforms, telemetry);

                    // From the remaining platforms, skip the ones that don't support 'cordova check_reqs'
                    requestedPlatforms = InstallReqs.skipNoReqsSupport(requestedPlatforms, telemetry);

                    // If we don't have any remaining platforms, print message and return
                    loggerHelper.logSeparatorLine();
                    logger.logLine();

                    telemetry.addWithPiiEvaluator("platformsToActuallyUse", requestedPlatforms, buildTelemetryHelper.getIsPlatformPii());
                    if (requestedPlatforms.length === 0) {
                        logger.log(resources.getString("CommandInstallNothingToInstall"));

                        return Q({});
                    }

                    // Run the dependency installer on the remaining platforms
                    logger.log(resources.getString("CommandInstallFinalPlatforms", requestedPlatforms.join(", ")));
                    logger.logLine();

                    return cordovaWrapper.requirements(requestedPlatforms)
                        .then(function (result: any): Q.Promise<any> {
                            var sessionId = tacoUtils.Telemetry.isOptedIn ?
                                tacoUtils.Telemetry.getSessionId() : // Valid session ID to publish telemetry
                                null; // Null session ID to not publish telemetry
                            var installer: DependencyInstaller = new DependencyInstaller(sessionId);

                            return installer.run(result);
                        });
                });
        }).thenResolve(<TacoUtility.ICommandTelemetryProperties>{});
    }

    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
        return true;
    }

    private static getInstalledPlatforms(): string[] {
        // Assume we are at the project root
        if (!fs.existsSync(InstallReqs.PlatformsFolderName)) {
            throw errorHelper.get(TacoErrorCodes.CommandInstallNoPlatformsFolder);
        }

        var platforms: string[] = [];

        fs.readdirSync(InstallReqs.PlatformsFolderName).forEach(function (file: string): void {
            if (fs.statSync(path.join(InstallReqs.PlatformsFolderName, file)).isDirectory()) {
                // Assume that every folder under root/platforms is an installed platform
                platforms.push(file);
            }
        });

        return platforms;
    }

    private static removeDuplicates(platforms: string[]): string[] {
        var seen: { [platform: string]: boolean } = {};
        var uniques: string[] = [];

        platforms.forEach(function (platform: string): void {
            if (!seen[platform]) {
                seen[platform] = true;
                uniques.push(platform);
            }
        });

        return uniques;
    }

    private static removePlatformFromList(platform: string, requestedPlatforms: string[]): string[] {
        return requestedPlatforms.filter((p: string) => p !== platform);
    }

    private static printPlatformList(platforms: string[], printVersions?: boolean): void {
        var table: INameDescription[] = platforms.map(function (platform: string): INameDescription {
            var name: string = resources.getString("CommandInstallPlatformBullet", platform);
            var desc: string = "";

            if (printVersions && !!InstallReqs.MinPlatformVersions[platform]) {
                desc = resources.getString("CommandInstallPlatformVersion", platform, InstallReqs.MinPlatformVersions[platform]);
            }

            return { name: name, description: desc };
        });

        loggerHelper.logNameDescriptionTable(table);
    }

    private static supportsCheckReqs(platform: string): boolean {
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

    private static skipSystemPlatforms(requestedPlatforms: string[]): string[] {
        var skippedPlatforms: string[] = [];
        var result: string[] = requestedPlatforms.slice();

        if (process.platform !== "darwin" && requestedPlatforms.indexOf("ios") > -1) {
            result = InstallReqs.removePlatformFromList("ios", result);
            skippedPlatforms.push("ios");
        }

        if (process.platform !== "win32") {
            if (requestedPlatforms.indexOf("windows") > -1) {
                result = InstallReqs.removePlatformFromList("windows", result);
                skippedPlatforms.push("windows");
            }

            if (requestedPlatforms.indexOf("wp8") > -1) {
                result = InstallReqs.removePlatformFromList("wp8", result);
                skippedPlatforms.push("wp8");
            }
        }

        if (skippedPlatforms.length > 0) {
            logger.logWarning(resources.getString("CommandInstallSkipSystem"));
            InstallReqs.printPlatformList(skippedPlatforms);
            logger.logLine();
            logger.logLine();
        }

        return result;
    }

    private static skipNotInstalled(requestedPlatforms: string[], installedPlatforms: string[], telemetry: tacoUtils.TelemetryGenerator): string[] {
        var skippedPlatforms: string[] = [];
        var result: string[] = [];

        requestedPlatforms.forEach(function (platform: string): void {
            if (installedPlatforms.indexOf(platform) === -1) {
                skippedPlatforms.push(platform);
            } else {
                result.push(platform);
            }
        });

        if (skippedPlatforms.length > 0) {
            telemetry.addWithPiiEvaluator("platformsSkippedDueToNotAdded", skippedPlatforms, buildTelemetryHelper.getIsPlatformPii());
            logger.logWarning(resources.getString("CommandInstallSkipNotAdded"));
            InstallReqs.printPlatformList(skippedPlatforms);
            logger.logLine();
            logger.logLine();
        }

        return result;
    }

    private static skipNoReqsSupport(requestedPlatforms: string[], telemetry: tacoUtils.TelemetryGenerator): string[] {
        var skippedPlatforms: string[] = [];
        var result: string[] = [];

        requestedPlatforms.forEach(function (platform: string): void {
            if (!InstallReqs.supportsCheckReqs(platform)) {
                skippedPlatforms.push(platform);
            } else {
                result.push(platform);
            }
        });

        if (skippedPlatforms.length > 0) {
            telemetry.addWithPiiEvaluator("platformsSkippedDueToNoReqsSupport", skippedPlatforms, buildTelemetryHelper.getIsPlatformPii());
            logger.logWarning(resources.getString("CommandInstallSkipNoReqsSupport"));
            InstallReqs.printPlatformList(skippedPlatforms, true);
            logger.logLine();
            logger.log(resources.getString("CommandInstallNoReqsSupportHint"));
            logger.logLine();
            logger.logLine();
        }

        return result;
    }

    private static parseArguments(args: commands.ICommandData): commands.ICommandData {
        return tacoUtils.ArgsHelper.parseArguments(InstallReqs.KnownOptions, {}, args.original, 0);
    }
}

export = InstallReqs;