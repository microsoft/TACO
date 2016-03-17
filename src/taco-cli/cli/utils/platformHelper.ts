// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/tacoUtils.d.ts" />
/// <reference path="../../../typings/Q.d.ts" />
/// <reference path="../../../typings/nopt.d.ts" />
"use strict";

import fs = require ("fs");
import os = require ("os");
import path = require ("path");
import Q = require ("q");

import resources = require ("../../resources/resourceManager");
import TacoErrorCodes = require ("../tacoErrorCodes");
import errorHelper = require ("../tacoErrorHelper");
import Settings = require ("./settings");
import tacoUtils = require ("taco-utils");

import commands = tacoUtils.Commands;
import CordovaHelper = tacoUtils.CordovaHelper;
import logger = tacoUtils.Logger;

/*
 * A static class which is responsible for dealing with cordova platform determination
 */
class PlatformHelper {
    /*
     * Given the command line options, determine which platforms we should operate on.
     * For example, "--local foo" specifies the local platform foo.
     *              "--remote bar" specifies the remote platform bar
     *              "--local" specifies all local platforms, but if there is nothing in /platforms then this is an error
     *              "--remote" specifies all remote platforms, but if there are no remote platforms configured then this is an error
     *              "foo" should build remotely if there is a remote configuration, otherwise it should build locally
     *              "" means all platforms in the following order:
     *                 - If a platform has a remote configuration, then perform a remote build
     *                 - If a platform exists in /platforms and does not have a remote configuration, then perform a local build
     */
    public static determinePlatform(options: commands.ICommandData): Q.Promise<PlatformHelper.IPlatformWithLocation[]> {
        return Q.all<any>([
            CordovaHelper.getSupportedPlatforms(),
            PlatformHelper.determinePlatformsFromOptions(options)
        ]).spread<PlatformHelper.IPlatformWithLocation[]>(function (supportedPlatforms: IDictionary<any>,
            platforms: PlatformHelper.IPlatformWithLocation[]): PlatformHelper.IPlatformWithLocation[] {
            var filteredPlatforms: PlatformHelper.IPlatformWithLocation[] = platforms.filter(function (platform: PlatformHelper.IPlatformWithLocation): boolean {
                var supported: boolean = !supportedPlatforms || platform.platform in supportedPlatforms || platform.location === PlatformHelper.BuildLocationType.Remote;
                if (!supported) {
                    logger.logWarning(resources.getString("CommandUnsupportedPlatformIgnored", platform.platform));
                }

                return supported;
            });
            if (filteredPlatforms.length > 0) {
                return filteredPlatforms;
            } else {
                throw errorHelper.get(TacoErrorCodes.ErrorNoPlatformsFound);
            }
        });
    }

    public static determineSpecificPlatformsFromOptions(options: commands.ICommandData, settings: Settings.ISettings): PlatformHelper.IPlatformWithLocation[] {
        var platforms: string[] = PlatformHelper.parseRequestedPlatforms(options);
        // one or more specific platforms are specified. Determine whether they should be built locally, remotely, or local falling back to remote
        return platforms.map(function (platform: string): PlatformHelper.IPlatformWithLocation {
            var buildLocation: PlatformHelper.BuildLocationType;
            if (options.options["remote"]) {
                buildLocation = PlatformHelper.BuildLocationType.Remote;
            } else if (options.options["local"]) {
                buildLocation = PlatformHelper.BuildLocationType.Local;
            } else {
                // we build remotely if either remote server is setup for the given platform or if the target platform cannot be built locally
                buildLocation = (platform in (settings.remotePlatforms || {})) || !PlatformHelper.canBuildLocally(platform) ?
                    PlatformHelper.BuildLocationType.Remote : PlatformHelper.BuildLocationType.Local;
            }

            return { location: buildLocation, platform: platform };
        });
    }

    /**
     * Parse the command line options to extract any platforms that are mentioned.
     * Platforms are any non-flag arguments before a lone --
     *
     * e.g. taco build ios --device               ==> 'ios'
     *      taco build windows android -- --phone ==> 'windows', 'android'
     *      taco build --local browser -- ios     ==> 'browser'
     */
    public static parseRequestedPlatforms(options: commands.ICommandData): string[] {
        var optionsToIgnore: string[] = options.original.indexOf("--") === -1 ? [] : options.original.slice(options.original.indexOf("--"));
        return options.remain.filter(function (platform: string): boolean { return optionsToIgnore.indexOf(platform) === -1; });
    }

    /**
     * Given the command line options, determine what platforms we wish to operate on.
     * 
     * This function determines the platforms to work with, as well as whether they are local or remote.
     * If the command line options specify any platforms, then we will return exactly those platforms, with
     * appropriate settings for local/remote.
     *
     * If the command line options do not specify platforms, then we use all configured remote platforms as remote,
     * and all added local platforms as local. If a platform is both added locally and has a remote configured, we will
     * use the remote, unless an override is specified.
     */
    public static determinePlatformsFromOptions(options: commands.ICommandData): Q.Promise<PlatformHelper.IPlatformWithLocation[]> {
        return Settings.loadSettingsOrReturnEmpty().then((settings: Settings.ISettings): PlatformHelper.IPlatformWithLocation[] => {
            // Enumerate all installed/configured platforms
            var remotePlatforms: string[] = [];
            if (!options.options["local"]) {
                // If we are not only building locally, then we need to consider any remote-only builds we need to do
                remotePlatforms = Object.keys(settings.remotePlatforms || {});
            }

            var localPlatforms: string[] = [];
            if (!options.options["remote"] && fs.existsSync("platforms")) {
                // Check for local platforms to try building
                localPlatforms = fs.readdirSync("platforms").filter(function (entry: string): boolean {
                    return fs.statSync(path.join("platforms", entry)).isDirectory() && remotePlatforms.indexOf(entry) === -1;
                });
            }

            return remotePlatforms.map(function (platform: string): PlatformHelper.IPlatformWithLocation {
                return { location: PlatformHelper.BuildLocationType.Remote, platform: platform };
            }).concat(localPlatforms.map(function (platform: string): PlatformHelper.IPlatformWithLocation {
                return { location: PlatformHelper.BuildLocationType.Local, platform: platform };
                }));
        }).then((platforms: PlatformHelper.IPlatformWithLocation[]): PlatformHelper.IPlatformWithLocation[] => {
            var requestedPlatforms: string[] = PlatformHelper.parseRequestedPlatforms(options);

            if (requestedPlatforms.length > 0) {
                // Filter down to user-requested platforms if appropriate
                return requestedPlatforms.map((platform: string): PlatformHelper.IPlatformWithLocation => {
                    if (!options.options["local"] && platforms.some((p: PlatformHelper.IPlatformWithLocation): boolean => {
                        return p.platform === platform && p.location === PlatformHelper.BuildLocationType.Remote;
                    })) {
                        // If we found a remote configuration for the platform default to using that
                        return { platform: platform, location: PlatformHelper.BuildLocationType.Remote };
                    } else {
                        // Otherwise if the --local flag was given or no remote was configured, use the platform locally
                        return { platform: platform, location: PlatformHelper.BuildLocationType.Local };
                    }
                });
            }

            // Otherwise return all the platforms we found.
            return platforms;
        }).then((platforms: PlatformHelper.IPlatformWithLocation[]): PlatformHelper.IPlatformWithLocation[] => {
            return platforms.filter((platform: PlatformHelper.IPlatformWithLocation): boolean => {
                // If the user specified --remote, then any local platforms at this point
                // Must be user-specified and non-configured, so warn about them.
                if (options.options["remote"] && platform.location === PlatformHelper.BuildLocationType.Local) {
                    logger.logWarning(resources.getString("NoRemoteConfigurationFoundForPlatform", platform.platform));
                    return false;
                }
                return true;
            });
        });
    }

    /**
     * Apply functions to all local and remote platforms.
     * Local platforms are batched into one list because Cordova does not cope with multiple concurrent invocations
     * Remote platforms are done individually (but concurrently with each other and local platforms) since they may
     * go to completely different servers.
     */
    public static operateOnPlatforms(platforms: PlatformHelper.IPlatformWithLocation[],
        localFunction: (platforms: string[]) => Q.Promise<any>,
        remoteFunction: (platforms: string) => Q.Promise<any>): Q.Promise<any> {

        var localPlatforms: string[] = platforms.filter((platform: PlatformHelper.IPlatformWithLocation): boolean => {
            return platform.location === PlatformHelper.BuildLocationType.Local;
        }).map((platform: PlatformHelper.IPlatformWithLocation) => platform.platform);

        var remotePlatforms: string[] = platforms.filter((platform: PlatformHelper.IPlatformWithLocation): boolean => {
            return platform.location === PlatformHelper.BuildLocationType.Remote;
        }).map((platform: PlatformHelper.IPlatformWithLocation) => platform.platform);

        // We batch all local platforms together so we make one cordova.raw.build(["foo", "bar", "baz"]) invocation,
        // because these raw functions are not safe to invoke concurrently.
        var buildLocalPlatforms: Q.Promise<any> = localPlatforms.length > 0 ? localFunction(localPlatforms) : Q({});
        var buildRemotePlatforms: Q.Promise<any>[] = remotePlatforms.map(remoteFunction);

        return Q.all([buildLocalPlatforms].concat(buildRemotePlatforms));
    }

    /**
     * Determine whether the given target platform can be built on the local machine
     *
     * @targetPlatform {string} target platform to build, e.g. ios, windows
     * @return {boolean} true if target platform can be built on local machine
     */
    private static canBuildLocally(targetPlatform: string): boolean {
        switch (os.platform()) {
            case "darwin":
                return targetPlatform !== "windows";  // can be android, ios
            case "win32":
                return targetPlatform !== "ios";  // can be android, wp*, or windows
        }

        return false;
    }
}

module PlatformHelper {
    export enum BuildLocationType {
        Local,
        Remote
    }

    export interface IPlatformWithLocation {
        platform: string;
        location: BuildLocationType;
    }
}

export = PlatformHelper;
