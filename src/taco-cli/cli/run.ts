/// <reference path="../../typings/taco-utils.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />
"use strict";

import assert = require ("assert");
import child_process = require ("child_process");
import fs = require ("fs");
import path = require ("path");
import Q = require ("q");
import tacoUtility = require ("taco-utils");
import commands = tacoUtility.Commands;
import resources = tacoUtility.ResourcesManager;
import logger = tacoUtility.Logger;
import level = logger.Level;
import BuildInfo = tacoUtility.BuildInfo;
import UtilHelper = tacoUtility.UtilHelper;

import CordovaWrapper = require ("./utils/cordova-wrapper");

import RemoteBuild = require ("./remote-build/remotebuild-client");
import RemoteBuildSettings = require ("./remote-build/build-settings");

import Settings = require ("./utils/settings");

/*
 * Run
 *
 * handles "taco run"
 */
class Run extends commands.TacoCommandBase implements commands.IDocumentedCommand {
    private static KnownOptions: Nopt.CommandData = {
        local: Boolean,
        remote: Boolean,
        debuginfo: Boolean,
        nobuild: Boolean,

        // TODO: What if the last build we did wasn't for the appropriate target?
        device: Boolean,
        emulator: Boolean,
        target: String,

        // Are these only for when we build as part of running?
        debug: Boolean,
        release: Boolean
    };
    private static ShortHands: Nopt.ShortFlags = {};
    public subcommands: commands.ICommand[] = [
        {
            // Remote Run
            run: Run.remote,
            canHandleArgs(commandData: commands.ICommandData): boolean {
                return !!commandData.options["remote"];
            }
        },
        {
            // Local Run
            run: Run.local,
            canHandleArgs(commandData: commands.ICommandData): boolean {
                return !!commandData.options["local"];
            }
        },
        {
            // Fallback
            run: Run.fallback,
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
        if (data.original.indexOf("--local") !== -1) {
            // local runs are equivalent to cordova runs
            return false;
        }

        return true;
    }

    public parseArgs(args: string[]): commands.ICommandData {
        var parsedOptions = UtilHelper.parseArguments(Run.KnownOptions, Run.ShortHands, args, 0);

        // Raise errors for invalid command line parameters
        if (parsedOptions.options["remote"] && parsedOptions.options["local"]) {
            logger.logErrorLine(resources.getString("command.notBothLocalRemote"));
            throw new Error("command.notBothLocalRemote");
        }

        if (parsedOptions.options["device"] && parsedOptions.options["emulator"]) {
            logger.logErrorLine(resources.getString("command.notBothDeviceEmulate"));
            throw new Error("command.notBothDeviceEmulate");
        }

        return parsedOptions;
    }

    private static remote(commandData: commands.ICommandData): Q.Promise<any> {
        return Settings.determinePlatform(commandData).then(function (platforms: Settings.IPlatformWithLocation[]): Q.Promise<any> {
            return Q.all(platforms.map(function (platform: Settings.IPlatformWithLocation): Q.Promise<any> {
                assert(platform.location === Settings.BuildLocationType.Remote);
                return Run.runRemotePlatform(platform.platform, commandData);
            }));
        });
    }

    private static runRemotePlatform(platform: string, commandData: commands.ICommandData): Q.Promise<any> {
        return Settings.loadSettings().then(function (settings: Settings.ISettings): Q.Promise<any> {
            var configuration = commandData.options["release"] ? "release" : "debug";
            var buildTarget = commandData.options["target"] || "iphone 5"; // TODO: Select an appropriate default for the platform, or leave target unspecified and have the server pick a default
            var language = settings.language || "en";
            var remoteConfig = settings.remotePlatforms[platform];
            if (!remoteConfig) {
                throw new Error(resources.getString("command.remotePlatformNotKnown", platform));
            }

            var buildServerUrl = Settings.getRemoteServerUrl(remoteConfig);
            var buildInfoPath = path.resolve(".", "remote", platform, configuration, "buildInfo.json");
            var buildInfoPromise: Q.Promise<BuildInfo>;
            var buildSettings = new RemoteBuildSettings({
                projectSourceDir: path.resolve("."),
                buildServerInfo: remoteConfig,
                buildCommand: "build",
                platform: platform,
                configuration: configuration,
                buildTarget: buildTarget,
                language: language
            });

            // Find the build that we are supposed to run
            buildInfoPromise = RemoteBuild.checkForBuildOnServer(buildSettings, buildInfoPath).then(function (buildInfo: BuildInfo): Q.Promise<BuildInfo> {
                if (buildInfo) {
                    return Q(buildInfo);
                } else if (commandData.options["nobuild"]) {
                    // No info for the remote build: User must build first
                    var buildCommandToRun = "taco build" + ([commandData.options["remote"] ? " --remote" : ""].concat(commandData.remain).join(" "));
                    logger.logErrorLine(resources.getString("NoRemoteBuildIdFound", buildCommandToRun));
                    throw new Error("NoRemoteBuildIdFound");
                } else {
                    return RemoteBuild.build(buildSettings);
                }
            });

            // TODO: do we always configure for debugging?
            var runPromise: Q.Promise<BuildInfo>;
            if (commandData.options["emulator"]) {
                runPromise = buildInfoPromise.then(function (buildInfo: BuildInfo): Q.Promise<BuildInfo> {
                    return RemoteBuild.emulate(buildInfo, remoteConfig, buildTarget);
                });
            } else {
                runPromise = buildInfoPromise.then(function (buildInfo: BuildInfo): Q.Promise<BuildInfo> {
                    return RemoteBuild.run(buildInfo, remoteConfig);
                });
            }

            return runPromise.then(function (buildInfo: BuildInfo): Q.Promise<BuildInfo> {
                if (commandData.options["debuginfo"]) {
                    // enable debugging and report connection information
                    return RemoteBuild.debug(buildInfo, remoteConfig)
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

    private static local(commandData: commands.ICommandData): Q.Promise<any> {
        CordovaWrapper.cli(commandData.original);
        return Q({});
    }

    private static fallback(commandData: commands.ICommandData): Q.Promise<any> {
        return Settings.determinePlatform(commandData).then(function (platforms: Settings.IPlatformWithLocation[]): Q.Promise<any> {
            return platforms.reduce<Q.Promise<any>>(function (soFar: Q.Promise<any>, platform: Settings.IPlatformWithLocation): Q.Promise<any> {
                return soFar.then(function (): Q.Promise<any> {
                    var promise: Q.Promise<any> = Q({});
                    var remoteRunFunc = function (): Q.Promise<any> {
                        return Run.runRemotePlatform(platform.platform, commandData);
                    };
                    var localRunFunc = function (): Q.Promise<any> {
                        return CordovaWrapper.build(platform.platform);
                    };
                    switch (platform.location) {
                        case Settings.BuildLocationType.Local:
                            // Just run local, and failures are failures
                            return promise.then(localRunFunc);
                        case Settings.BuildLocationType.Remote:
                            // Just run remote, and failures are failures
                            return promise.then(remoteRunFunc);
                    }
                });
            }, Q({}));
        });
    }
}

export = Run;