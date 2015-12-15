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

import buildTelemetryHelper = require ("./utils/buildTelemetryHelper");
import RemoteBuildSettings = require ("./remoteBuild/buildSettings");
import PlatformHelper = require ("./utils/platformHelper");
import RemoteBuildClientHelper = require ("./remoteBuild/remoteBuildClientHelper");
import resources = require ("../resources/resourceManager");
import Settings = require ("./utils/settings");
import TacoErrorCodes = require ("./tacoErrorCodes");
import errorHelper = require ("./tacoErrorHelper");
import tacoUtility = require ("taco-utils");

import BuildInfo = tacoUtility.BuildInfo;
import CordovaWrapper = tacoUtility.CordovaWrapper;
import commands = tacoUtility.Commands;
import logger = tacoUtility.Logger;

import ICommandTelemetryProperties = tacoUtility.ICommandTelemetryProperties;

/**
 * Emulate
 *
 * handles "taco emulate"
 */
class Emulate extends commands.TacoCommandBase {
    private static KNOWN_OPTIONS: Nopt.CommandData = {
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
    private static SHORT_HANDS: Nopt.ShortFlags = {};

    public name: string = "run";
    public info: commands.ICommandInfo;

    private static generateTelemetryProperties(telemetryProperties: tacoUtility.ICommandTelemetryProperties,
        commandData: commands.ICommandData): Q.Promise<tacoUtility.ICommandTelemetryProperties> {
        return buildTelemetryHelper.addCommandLineBasedPropertiesForBuildAndRun(telemetryProperties, Emulate.KNOWN_OPTIONS, commandData);
    }

    private static runRemotePlatform(platform: string, commandData: commands.ICommandData,
        telemetryProperties: ICommandTelemetryProperties): Q.Promise<any> {
        return Q.all<any>([Settings.loadSettings(), CordovaWrapper.getCordovaVersion()]).spread<any>(function (settings: Settings.ISettings, cordovaVersion: string): Q.Promise<any> {
            var configuration: string = commandData.options["release"] ? "release" : "debug";
            var buildTarget: string = commandData.options["target"] || "";
            var language: string = settings.language || "en";
            var remoteConfig: Settings.IRemoteConnectionInfo = settings.remotePlatforms && settings.remotePlatforms[platform];
            if (!remoteConfig) {
                throw errorHelper.get(TacoErrorCodes.CommandRemotePlatformNotKnown, platform);
            }

            var buildInfoPath: string = path.resolve(".", "remote", platform, configuration, "buildInfo.json");
            var buildInfoPromise: Q.Promise<BuildInfo>;
            var buildSettings: RemoteBuildSettings = new RemoteBuildSettings({
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
                        var buildCommandToRun: string = "taco build" + ([commandData.options["remote"] ? " --remote" : ""].concat(commandData.remain).join(" "));
                        throw errorHelper.get(TacoErrorCodes.NoRemoteBuildIdFound, buildCommandToRun);
                    } else {
                        return buildInfo;
                    }
                });
            } else {
                // Always do a rebuild, but incrementally if possible.
                buildInfoPromise = RemoteBuildClientHelper.build(buildSettings, telemetryProperties);
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

    protected runCommand(): Q.Promise<tacoUtility.ICommandTelemetryProperties> {
        var commandData: commands.ICommandData = this.data;
        var telemetryProperties: ICommandTelemetryProperties = {};
        var self = this;
        return Q.all<any>([PlatformHelper.determinePlatform(commandData), Settings.loadSettingsOrReturnEmpty()])
            .spread((platforms: PlatformHelper.IPlatformWithLocation[], settings: Settings.ISettings): Q.Promise<any> => {
                buildTelemetryHelper.storePlatforms(telemetryProperties, "actuallyBuilt", platforms, settings);
                return PlatformHelper.operateOnPlatforms(platforms,
                    (localPlatforms: string[]): Q.Promise<any> => self.runLocalEmulate(localPlatforms),
                    (remotePlatform: string): Q.Promise<any> => Emulate.runRemotePlatform(remotePlatform, commandData, telemetryProperties)
                    );
            }).then(() => Emulate.generateTelemetryProperties(telemetryProperties, commandData));
    }

    public parseArgs(args: string[]): commands.ICommandData {
        var parsedOptions: commands.ICommandData = tacoUtility.ArgsHelper.parseArguments(Emulate.KNOWN_OPTIONS, Emulate.SHORT_HANDS, args, 0);

        // Raise errors for invalid command line parameters
        if (parsedOptions.options["remote"] && parsedOptions.options["local"]) {
            throw errorHelper.get(TacoErrorCodes.ErrorIncompatibleOptions, "--remote", "--local");
        }

        if (parsedOptions.options["device"]) {
            throw errorHelper.get(TacoErrorCodes.ErrorIncompatibleOptions, "--device", "--emulate");
        }

        if (parsedOptions.options["debug"] && parsedOptions.options["release"]) {
            throw errorHelper.get(TacoErrorCodes.ErrorIncompatibleOptions, "--debug", "--release");
        }
        
        if (parsedOptions.options["livereload"] && parsedOptions.options["remote"]) {
            throw errorHelper.get(TacoErrorCodes.ErrorIncompatibleOptions, "--livereload", "--remote");
        }

        if (parsedOptions.options["devicesync"] && parsedOptions.options["remote"]) {
            throw errorHelper.get(TacoErrorCodes.ErrorIncompatibleOptions, "--devicesync", "--remote");
        }

        if (parsedOptions.options["devicesync"] && parsedOptions.options["livereload"]) {
            throw errorHelper.get(TacoErrorCodes.ErrorIncompatibleOptions, "--devicesync", "--livereload");
        }

        return parsedOptions;
    }

    private runLocalEmulate(localPlatforms: string[]): Q.Promise<any> {
        if (this.data.options["livereload"] || this.data.options["devicesync"]) {
            // intentionally delay-requiring it since liveReload fetches whole bunch of stuff
            return require("./liveReload").startLiveReload(!!this.data.options["livereload"], !!this.data.options["devicesync"], localPlatforms);
        }
        return CordovaWrapper.emulate(this.data, localPlatforms);
    }

}

export = Emulate;
