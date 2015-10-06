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

import assert = require ("assert");
import path = require ("path");
import Q = require ("q");

import buildTelemetryHelper = require ("./utils/buildTelemetryHelper");
import CordovaWrapper = require ("./utils/cordovaWrapper");
import errorHelper = require ("./tacoErrorHelper");
import PlatformHelper = require ("./utils/platformHelper");
import RemoteBuildClientHelper = require ("./remoteBuild/remotebuildClientHelper");
import RemoteBuildSettings = require ("./remoteBuild/buildSettings");
import resources = require ("../resources/resourceManager");
import Settings = require ("./utils/settings");
import TacoErrorCodes = require ("./tacoErrorCodes");
import tacoUtility = require ("taco-utils");

import BuildInfo = tacoUtility.BuildInfo;
import commands = tacoUtility.Commands;
import logger = tacoUtility.Logger;

import ICommandTelemetryProperties = tacoUtility.ICommandTelemetryProperties;

/**
 * Run
 *
 * handles "taco run"
 */
class Run extends commands.TacoCommandBase {
    private static KNOWN_OPTIONS: Nopt.CommandData = {
        local: Boolean,
        remote: Boolean,
        debuginfo: Boolean,
        nobuild: Boolean,

        device: Boolean,
        emulator: Boolean,
        target: String,

        // Are these only for when we build as part of running?
        debug: Boolean,
        release: Boolean
    };
    private static SHORT_HANDS: Nopt.ShortFlags = {};

    public name: string = "run";
    public info: commands.ICommandInfo;

    private static generateTelemetryProperties(telemetryProperties: tacoUtility.ICommandTelemetryProperties,
        commandData: commands.ICommandData): Q.Promise<tacoUtility.ICommandTelemetryProperties> {
        return buildTelemetryHelper.addCommandLineBasedPropertiesForBuildAndRun(telemetryProperties, Run.KNOWN_OPTIONS, commandData);
    }

    private static remote(commandData: commands.ICommandData): Q.Promise<tacoUtility.ICommandTelemetryProperties> {
        var telemetryProperties: tacoUtility.ICommandTelemetryProperties = {};
        return Q.all<any>([PlatformHelper.determinePlatform(commandData), Settings.loadSettingsOrReturnEmpty()])
            .spread((platforms: PlatformHelper.IPlatformWithLocation[], settings: Settings.ISettings) => {
                buildTelemetryHelper.storePlatforms(telemetryProperties, "actuallyBuilt", platforms, settings);
                return Q.all(platforms.map(function (platform: PlatformHelper.IPlatformWithLocation): Q.Promise<any> {
                    assert(platform.location === PlatformHelper.BuildLocationType.Remote);
                    return Run.runRemotePlatform(platform.platform, commandData, telemetryProperties);
                }));
            }).then(() => Run.generateTelemetryProperties(telemetryProperties, commandData));
    }

    private static runRemotePlatform(platform: string, commandData: commands.ICommandData, telemetryProperties: ICommandTelemetryProperties): Q.Promise<any> {
        return Q.all<any>([Settings.loadSettings(), CordovaWrapper.getCordovaVersion()]).spread<any>(function (settings: Settings.ISettings, cordovaVersion: string): Q.Promise<any> {
            var configuration = commandData.options["release"] ? "release" : "debug";
            var buildTarget = commandData.options["target"] || (commandData.options["device"] ? "device" : "");
            var language = settings.language || "en";
            var remoteConfig = settings.remotePlatforms && settings.remotePlatforms[platform];
            if (!remoteConfig) {
                throw errorHelper.get(TacoErrorCodes.CommandRemotePlatformNotKnown, platform);
            }

            var buildOptions = commandData.remain.filter(function (opt: string): boolean { return opt.indexOf("--") === 0; });
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
                cordovaVersion: cordovaVersion,
                options: buildOptions
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
                buildInfoPromise = RemoteBuildClientHelper.build(buildSettings, telemetryProperties);
            }

            // Default to a simulator/emulator build unless explicitly asked otherwise
            // This makes sure that our defaults match Cordova's, as well as being consistent between our own build and run.
            var runPromise: Q.Promise<BuildInfo>;
            if (commandData.options["device"]) {
                runPromise = buildInfoPromise.then(function (buildInfo: BuildInfo): Q.Promise<BuildInfo> {
                    return RemoteBuildClientHelper.run(buildInfo, remoteConfig);
                }).then(function (buildInfo: BuildInfo): BuildInfo {
                    logger.log(resources.getString("CommandRunRemoteDeviceSuccess"));
                    return buildInfo;
                });
            } else {
                runPromise = buildInfoPromise.then(function (buildInfo: BuildInfo): Q.Promise<BuildInfo> {
                    return RemoteBuildClientHelper.emulate(buildInfo, remoteConfig, buildTarget);
                }).then(function (buildInfo: BuildInfo): BuildInfo {
                    logger.log(resources.getString("CommandRunRemoteEmulatorSuccess"));
                    return buildInfo;
                });
            }

            return runPromise.then(function (buildInfo: BuildInfo): Q.Promise<BuildInfo> {
                if (commandData.options["debuginfo"]) {
                    // enable debugging and report connection information
                    return RemoteBuildClientHelper.debug(buildInfo, remoteConfig)
                        .then(function (debugBuildInfo: BuildInfo): BuildInfo {
                            if (debugBuildInfo["webDebugProxyPort"]) {
                                logger.log(JSON.stringify({ webDebugProxyPort: debugBuildInfo["webDebugProxyPort"] }));
                            }

                            return debugBuildInfo;
                        });
                } else {
                    return Q(buildInfo);
                }
            });
        });
    }

    private static local(commandData: commands.ICommandData): Q.Promise<tacoUtility.ICommandTelemetryProperties> {
        return CordovaWrapper.run(commandData)
            .then(() => Run.generateTelemetryProperties({}, commandData));
    }

    private static fallback(commandData: commands.ICommandData): Q.Promise<tacoUtility.ICommandTelemetryProperties> {
        var telemetryProperties: tacoUtility.ICommandTelemetryProperties = {};
        return Q.all<any>([PlatformHelper.determinePlatform(commandData), Settings.loadSettingsOrReturnEmpty()])
            .spread((platforms: PlatformHelper.IPlatformWithLocation[], settings: Settings.ISettings): Q.Promise<any> => {
                buildTelemetryHelper.storePlatforms(telemetryProperties, "actuallyBuilt", platforms, settings);

                return PlatformHelper.operateOnPlatforms(platforms,
                    (localPlatforms: string[]): Q.Promise<any> => CordovaWrapper.run(commandData, localPlatforms),
                    (remotePlatform: string): Q.Promise<any> => Run.runRemotePlatform(remotePlatform, commandData, telemetryProperties)
                    );
        }).then(() => Run.generateTelemetryProperties(telemetryProperties, commandData));
    }

    /* tslint:disable:member-ordering */
    // tslint doesn't handle this case and considers subcommands as member function
    public subcommands: commands.ICommand[] = [
        {
            // Remote Run
            name: "remote",
            run: Run.remote,
            canHandleArgs(commandData: commands.ICommandData): boolean {
                return !!commandData.options["remote"];
            }
        },
        {
            // Local Run
            name: "local",
            run: Run.local,
            canHandleArgs(commandData: commands.ICommandData): boolean {
                return !!commandData.options["local"];
            }
        },
        {
            // Fallback
            name: "fallback",
            run: Run.fallback,
            canHandleArgs(commandData: commands.ICommandData): boolean {
                return true;
            }
        }
    ];
    /* tslint:enable:member-ordering */

    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
       return true;
    }

    public parseArgs(args: string[]): commands.ICommandData {
        var parsedOptions = tacoUtility.ArgsHelper.parseArguments(Run.KNOWN_OPTIONS, Run.SHORT_HANDS, args, 0);

        // Raise errors for invalid command line parameters
        if (parsedOptions.options["remote"] && parsedOptions.options["local"]) {
            throw errorHelper.get(TacoErrorCodes.ErrorIncompatibleOptions, "--remote", "--local");
        }

        if (parsedOptions.options["device"] && parsedOptions.options["emulator"]) {
            throw errorHelper.get(TacoErrorCodes.ErrorIncompatibleOptions, "--device", "--emulator");
        }

        if (parsedOptions.options["debug"] && parsedOptions.options["release"]) {
            throw errorHelper.get(TacoErrorCodes.ErrorIncompatibleOptions, "--debug", "--release");
        }

        return parsedOptions;
    }
}

export = Run;
