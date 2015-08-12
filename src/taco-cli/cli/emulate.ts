/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/tacoUtils.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />

"use strict";

import path = require ("path");
import Q = require ("q");

import RemoteBuildSettings = require ("./remoteBuild/buildSettings");
import CordovaWrapper = require ("./utils/CordovaWrapper");
import RemoteBuildClientHelper = require ("./remoteBuild/remotebuildClientHelper");
import resources = require ("../resources/resourceManager");
import Settings = require ("./utils/settings");
import TacoErrorCodes = require ("./tacoErrorCodes");
import errorHelper = require ("./tacoErrorHelper");
import tacoUtility = require ("taco-utils");

import BuildInfo = tacoUtility.BuildInfo;
import commands = tacoUtility.Commands;
import logger = tacoUtility.Logger;

/**
 * Emulate
 *
 * handles "taco emulate"
 */
class Emulate extends commands.TacoCommandBase{
    private static KnownOptions: Nopt.CommandData = {
        local: Boolean,
        remote: Boolean,
        debuginfo: Boolean,
        nobuild: Boolean,

        device: Boolean,
        target: String,

        // Are these only for when we build as part of running?
        debug: Boolean,
        release: Boolean
    };
    private static ShortHands: Nopt.ShortFlags = {};
    public subcommands: commands.ICommand[] = [
        {
            run: Emulate.emulate,
            canHandleArgs(commandData: commands.ICommandData): boolean {
                return true;
            }
        }
    ];

    public name: string = "run";
    public info: commands.ICommandInfo;

    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
        return true;
    }

    public parseArgs(args: string[]): commands.ICommandData {
        var parsedOptions = tacoUtility.ArgsHelper.parseArguments(Emulate.KnownOptions, Emulate.ShortHands, args, 0);

        // Raise errors for invalid command line parameters
        if (parsedOptions.options["remote"] && parsedOptions.options["local"]) {
            throw errorHelper.get(TacoErrorCodes.CommandNotBothLocalRemote);
        }

        if (parsedOptions.options["device"]) {
            throw errorHelper.get(TacoErrorCodes.CommandNotBothDeviceEmulate);
        }

        if (parsedOptions.options["debug"] && parsedOptions.options["release"]) {
            throw errorHelper.get(TacoErrorCodes.CommandNotBothDebugRelease);
        }

        return parsedOptions;
    }

    private static runRemotePlatform(platform: string, commandData: commands.ICommandData): Q.Promise<any> {
        return Q.all([Settings.loadSettings(), CordovaWrapper.getCordovaVersion()]).spread<any>(function (settings: Settings.ISettings, cordovaVersion: string): Q.Promise<any> {
            var configuration = commandData.options["release"] ? "release" : "debug";
            var buildTarget = commandData.options["target"] || "";
            var language = settings.language || "en";
            var remoteConfig = settings.remotePlatforms[platform];
            if (!remoteConfig) {
                throw errorHelper.get(TacoErrorCodes.CommandRemotePlatformNotKnown, platform);
            }

            var buildInfoPath = path.resolve(".", "remote", platform, configuration, "buildInfo.json");
            var buildInfoPromise: Q.Promise<BuildInfo>;
            var buildSettings = new RemoteBuildSettings({
                projectSourceDir: path.resolve("."),
                buildServerInfo: remoteConfig,
                buildCommand: "build",
                platform: platform,
                configuration: configuration,
                buildTarget: buildTarget,
                language: language,
                cordovaVersion: cordovaVersion
            });

            // Find the build that we are supposed to run
            if (commandData.options["nobuild"]) {
                buildInfoPromise = RemoteBuildClientHelper.checkForBuildOnServer(buildSettings, buildInfoPath).then(function (buildInfo: BuildInfo): BuildInfo {
                    if (!buildInfo) {
                        // No info for the remote build: User must build first
                        var buildCommandToRun = "taco build" + ([commandData.options["remote"] ? " --remote" : ""].concat(commandData.remain).join(" "));
                        throw errorHelper.get(TacoErrorCodes.NoRemoteBuildIdFound, buildCommandToRun);
                    } else {
                        return buildInfo;
                    }
                });
            } else {
                // Always do a rebuild, but incrementally if possible.
                buildInfoPromise = RemoteBuildClientHelper.build(buildSettings);
            }

            return buildInfoPromise.then(function (buildInfo: BuildInfo): Q.Promise<BuildInfo> {
                return RemoteBuildClientHelper.emulate(buildInfo, remoteConfig, buildTarget);
            }).then(function (buildInfo: BuildInfo): BuildInfo {
                logger.log(resources.getString("CommandRunRemoteEmulatorSuccess"));
                return buildInfo;
            }).then(function (buildInfo: BuildInfo): Q.Promise<BuildInfo> {
                if (commandData.options["debuginfo"]) {
                    // enable debugging and report connection information
                    return RemoteBuildClientHelper.debug(buildInfo, remoteConfig)
                        .then(function (buildInfo: BuildInfo): BuildInfo {
                            if (buildInfo["webDebugProxyPort"]) {
                                console.info(JSON.stringify({ webDebugProxyPort: buildInfo["webDebugProxyPort"] }));
                            }

                            return buildInfo;
                        });
                } else {
                    return Q(buildInfo);
                }
            });
        });
    }

    private static emulate(commandData: commands.ICommandData): Q.Promise<any> {
        return Settings.determinePlatform(commandData).then(function (platforms: Settings.IPlatformWithLocation[]): Q.Promise<any> {
            return platforms.reduce<Q.Promise<any>>(function (soFar: Q.Promise<any>, platform: Settings.IPlatformWithLocation): Q.Promise<any> {
                return soFar.then(function (): Q.Promise<any> {
                    switch (platform.location) {
                        case Settings.BuildLocationType.Local:
                            // Just run local, and failures are failures
                            return CordovaWrapper.emulate(commandData, platform.platform);
                        case Settings.BuildLocationType.Remote:
                            // Just run remote, and failures are failures
                            return Emulate.runRemotePlatform(platform.platform, commandData);
                    }
                });
            }, Q({}));
        });
    }
}

export = Emulate;
