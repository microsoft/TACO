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
/// <reference path="../../typings/cordovaExtensions.d.ts" />
/// <reference path="../../typings/rimraf.d.ts" />
"use strict";

import assert = require ("assert");
import child_process = require ("child_process");
import fs = require ("fs");
import nopt = require ("nopt");
import path = require ("path");
import Q = require ("q");
import rimraf = require ("rimraf");

import RemoteBuildSettings = require ("./remoteBuild/buildSettings");
import CordovaWrapper = require ("./utils/cordovaWrapper");
import RemoteBuildClientHelper = require ("./remoteBuild/remotebuildClientHelper");
import resources = require ("../resources/resourceManager");
import Settings = require ("./utils/settings");
import TacoErrorCodes = require ("./tacoErrorCodes");
import errorHelper = require ("./tacoErrorHelper");
import tacoUtility = require ("taco-utils");

import commands = tacoUtility.Commands;
import logger = tacoUtility.Logger;
import UtilHelper = tacoUtility.UtilHelper;

/*
 * Build
 *
 * handles "taco build"
 */
class Build extends commands.TacoCommandBase implements commands.IDocumentedCommand {
    private static KnownOptions: Nopt.CommandData = {
        local: Boolean,
        remote: Boolean,
        clean: Boolean,
        debug: Boolean,
        release: Boolean,
        device: Boolean,
        emulator: Boolean,
        target: String
    };
    private static ShortHands: Nopt.ShortFlags = {};

    /*
     * Exposed for testing purposes: when we talk to a mocked server we don't want 5s delays between pings
     */
    public static RemoteBuild = RemoteBuildClientHelper;
    public subcommands: commands.ICommand[] = [
        {
            // Remote Build
            run: Build.remote,
            canHandleArgs(commandData: commands.ICommandData): boolean {
                return !commandData.options["clean"] && !!commandData.options["remote"];
            }
        },
        {
            // Local Build
            run: Build.local,
            canHandleArgs(commandData: commands.ICommandData): boolean {
                return !commandData.options["clean"] && !!commandData.options["local"];
            }
        },
        {
            // Clean build
            run: Build.clean,
            canHandleArgs(commandData: commands.ICommandData): boolean {
                return !!commandData.options["clean"];
            }
        },
        {
            // Fallback: determine whether to build local or remote
            run: Build.fallback,
            canHandleArgs(commandData: commands.ICommandData): boolean {
                return !commandData.options["clean"];
            }
        }
    ];

    public name: string = "build";
    public info: commands.ICommandInfo;

    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
        // TODO: Revisit once we decide how to do the cordova passthrough
        if (data.original.indexOf("--local") !== -1 && data.original.indexOf("--clean") === -1) {
            // non-clean local builds are equivalent to cordova builds
            return false;
        }

        return true;
    }

    public parseArgs(args: string[]): commands.ICommandData {
        var parsedOptions = tacoUtility.ArgsHelper.parseArguments(Build.KnownOptions, Build.ShortHands, args, 0);

        // Raise errors for invalid command line parameters
        if (parsedOptions.options["remote"] && parsedOptions.options["local"]) {
            throw errorHelper.get(TacoErrorCodes.CommandNotBothLocalRemote);
        }

        if (parsedOptions.options["device"] && parsedOptions.options["emulator"]) {
            throw errorHelper.get(TacoErrorCodes.CommandNotBothDeviceEmulate);
        }

        if (parsedOptions.options["debug"] && parsedOptions.options["release"]) {
            throw errorHelper.get(TacoErrorCodes.CommandNotBothDebugRelease);
        }

        return parsedOptions;
    }

    private static clean(commandData: commands.ICommandData): Q.Promise<any> {
        return Settings.determinePlatform(commandData).then(function (platforms: Settings.IPlatformWithLocation[]): Q.Promise<any> {
            return platforms.reduce<Q.Promise<any>>(function (soFar: Q.Promise<any>, platform: Settings.IPlatformWithLocation): Q.Promise<any> {
                return soFar.then(function (): Q.Promise<any> {
                    return Build.cleanPlatform(platform, commandData);
                });
            }, Q({}));
        });
    }

    private static cleanPlatform(platform: Settings.IPlatformWithLocation, commandData: commands.ICommandData): Q.Promise<any> {
        var promise = Q({});
        switch (platform.location) {
        case Settings.BuildLocationType.Local:
            // To clean locally, try and run the clean script
            var cleanScriptPath = path.join("platforms", platform, "cordova", "clean");
            if (fs.existsSync(cleanScriptPath)) {
                promise = promise.then(function (): Q.Promise<any> {
                    return Q.denodeify(UtilHelper.loggedExec)(cleanScriptPath).fail(function (err: any): void {
                        // If we can't run the script, then show a warning but continue
                        logger.logWarning(err.toString());
                    });
                });
            }

            break;
        case Settings.BuildLocationType.Remote:
            if (!(commandData.options["release"] || commandData.options["debug"])) {
                // If neither --debug nor --release is specified, then clean both
                commandData.options["release"] = commandData.options["debug"] = true;
            }
            
            var remotePlatform = path.resolve(".", "remote", platform.platform);
            var configurations = ["release", "debug"];
            promise = configurations.reduce(function (promise: Q.Promise<any>, configuration: string): Q.Promise<any> {
                return promise.then(function (): void {
                    if (commandData.options[configuration]) {
                        var remotePlatformConfig = path.join(remotePlatform, configuration);
                        if (fs.existsSync(remotePlatformConfig)) {
                            logger.log(resources.getString("CleaningRemoteResources", platform.platform, configuration));
                            rimraf.sync(remotePlatformConfig);
                        }
                    }
                });
            }, promise);

            break;
        default:
            throw errorHelper.get(TacoErrorCodes.CommandBuildInvalidPlatformLocation, platform.platform);
        }

        return promise;
    }

    private static build(commandData: commands.ICommandData, remote: boolean = false): Q.Promise<any> {
        return Settings.determinePlatform(commandData).then(function (platforms: Settings.IPlatformWithLocation[]): Q.Promise<any> {
            return Q.all(platforms.map(function (platform: Settings.IPlatformWithLocation): Q.Promise<any> {
                if(remote) {
                assert(platform.location !== Settings.BuildLocationType.Local);
                return Build.buildRemotePlatform(platform.platform, commandData);
                }  else {
                    assert(platform.location === Settings.BuildLocationType.Local);
                    return CordovaWrapper.build(platform.platform, commandData);
                }
            }));
        });
    }

    private static local(commandData: commands.ICommandData): Q.Promise<any> {
        return Build.build(commandData, false);
    }

    private static remote(commandData: commands.ICommandData): Q.Promise<any> {
        return Build.build(commandData, true);
    }

    private static buildRemotePlatform(platform: string, commandData: commands.ICommandData): Q.Promise<any> {
        var configuration = commandData.options["release"] ? "release" : "debug";
        var buildTarget = commandData.options["target"] || (commandData.options["device"] ? "device" : commandData.options["emulator"] ? "emulator" : "");
        return Q.all([Settings.loadSettings(), CordovaWrapper.getCordovaVersion()]).spread<any>(function (settings: Settings.ISettings, cordovaVersion: string): Q.Promise<any> {
            var language = settings.language || "en";
            var remoteConfig = settings.remotePlatforms[platform];
            if (!remoteConfig) {
                throw errorHelper.get(TacoErrorCodes.CommandRemotePlatformNotKnown, platform);
            }

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
            return Build.RemoteBuild.build(buildSettings);
        });
    }

    private static local(commandData: commands.ICommandData): Q.Promise<any> {
        return CordovaWrapper.cli(commandData.original);
    }

    private static fallback(commandData: commands.ICommandData): Q.Promise<any> {
        return Settings.determinePlatform(commandData).then(function (platforms: Settings.IPlatformWithLocation[]): Q.Promise<any> {
            return platforms.reduce<Q.Promise<any>>(function (soFar: Q.Promise<any>, platform: Settings.IPlatformWithLocation): Q.Promise<any> {
                return soFar.then(function (): Q.Promise<any> {
                    switch (platform.location) {
                        case Settings.BuildLocationType.Local:
                            // Just build local, and failures are failures
                            return CordovaWrapper.build(platform.platform, commandData);
                        case Settings.BuildLocationType.Remote:
                            // Just build remote, and failures are failures
                            return Build.buildRemotePlatform(platform.platform, commandData);
                        default:
                            return Q.reject(errorHelper.get(TacoErrorCodes.CommandBuildInvalidPlatformLocation, platform.platform));
                    }
                });
            }, Q({}));
        });
    }
}

export = Build;
