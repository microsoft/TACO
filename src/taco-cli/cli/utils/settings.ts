/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/tacoUtils.d.ts" />
/// <reference path="../../../typings/Q.d.ts" />
/// <reference path="../../../typings/nopt.d.ts" />
"use strict";

import fs = require ("fs");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import util = require ("util");

import CordovaHelper = require ("./cordovaHelper");
import resources = require ("../../resources/resourceManager");
import TacoErrorCodes = require ("../tacoErrorCodes");
import errorHelper = require ("../tacoErrorHelper");
import tacoUtils = require ("taco-utils");

import commands = tacoUtils.Commands;
import logger = tacoUtils.Logger;
import utils = tacoUtils.UtilHelper;

/*
 * A static class which is responsible for dealing with the TacoSettings.json file
 */
class Settings {
    private static settings: Settings.ISettings = null;
    private static SETTINGS_FILENAME = "TacoSettings.json";

    public static get settingsFile(): string {
        return path.join(utils.tacoHome, Settings.SETTINGS_FILENAME);
    }

    /*
     * Load data from TACO_HOME/TacoSettings.json
     */
    public static loadSettings(): Q.Promise<Settings.ISettings> {
        if (Settings.settings) {
            return Q(Settings.settings);
        }

        try {
            Settings.settings = JSON.parse(<any> fs.readFileSync(Settings.settingsFile));
            return Q(Settings.settings);
        } catch (e) {
            if (e.code === "ENOENT") {
                // File doesn't exist, no need for a stack trace.
                // The error message will instruct the user to run "taco setup" to resolve the issue.
                return Q.reject<Settings.ISettings>(errorHelper.get(TacoErrorCodes.TacoSettingsFileDoesNotExist));
            } else {
                // Couldn't open the file, not sure why, so we'll keep the error around for the user
                return Q.reject<Settings.ISettings>(errorHelper.wrap(TacoErrorCodes.CommandBuildTacoSettingsNotFound, e));
            }
        }
    }

    public static saveSettings(settings: Settings.ISettings): Q.Promise<Settings.ISettings> {
        // save to TACO_HOME/TacoSettings.json and store as the cached version
        Settings.settings = settings;
        utils.createDirectoryIfNecessary(utils.tacoHome);
        fs.writeFileSync(Settings.settingsFile, JSON.stringify(settings));
        return Q(settings);
    }

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
    public static determinePlatform(options: commands.ICommandData): Q.Promise<Settings.IPlatformWithLocation[]> {
        return Q.all<any>([
            CordovaHelper.getSupportedPlatforms(),
            Settings.determinePlatformsFromOptions(options)
        ]).spread<Settings.IPlatformWithLocation[]>(function (supportedPlatforms: CordovaHelper.IDictionary<any>, platforms: Settings.IPlatformWithLocation[]): Settings.IPlatformWithLocation[] {
            var filteredPlatforms = platforms.filter(function (platform: Settings.IPlatformWithLocation): boolean {
                var supported = !supportedPlatforms || platform.platform in supportedPlatforms || platform.location === Settings.BuildLocationType.Remote;
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

    /**
     * Apply functions to all local and remote platforms.
     * Local platforms are batched into one list because Cordova does not cope with multiple concurrent invocations
     * Remote platforms are done individually (but concurrently with each other and local platforms) since they may
     * go to completely different servers.
     */
    public static operateOnPlatforms(platforms: Settings.IPlatformWithLocation[],
        localFunction: (platforms: string[]) => Q.Promise<any>,
        remoteFunction: (platforms: string) => Q.Promise<any>): Q.Promise<any> {
        var localPlatforms = platforms.filter((platform: Settings.IPlatformWithLocation) => {
            return platform.location === Settings.BuildLocationType.Local;
        }).map((platform: Settings.IPlatformWithLocation) => platform.platform);
        var remotePlatforms = platforms.filter((platform: Settings.IPlatformWithLocation) => {
            return platform.location === Settings.BuildLocationType.Remote;
        }).map((platform: Settings.IPlatformWithLocation) => platform.platform);

        // We batch all local platforms together so we make one cordova.raw.build(["foo", "bar", "baz"]) invocation,
        // because these raw functions are not safe to invoke concurrently.
        var buildLocalPlatforms = localPlatforms.length > 0 ? localFunction(localPlatforms) : Q({});
        var buildRemotePlatforms = remotePlatforms.map(remoteFunction);

        return Q.all([buildLocalPlatforms].concat(buildRemotePlatforms));
    }

    /*
     * Construct the base URL for the given build server
     */
    public static getRemoteServerUrl(server: Settings.IRemoteConnectionInfo): string {
        return util.format("http%s://%s:%d/%s", server.secure ? "s" : "", server.host, server.port, server.mountPoint);
    }

    /*
     * Update settings from TACO_HOME/TacoSettings.json (It loads the settings, give you a chance to update them, and then it saves them again)
     */
    public static updateSettings(updateFunction: (settings: Settings.ISettings) => void): Q.Promise<Settings.ISettings> {
        return this.loadSettings()
            .fail((error: any) => {
                if (error.errorCode === TacoErrorCodes.TacoSettingsFileDoesNotExist) {
                    // If it fails because the file doesn't exist, we just return some empty settings and we continue...
                    return {};
                } else {
                    /* If it fails for other reason, we rethrow the exception
                        (we don't want to override a file if we are not sure about the contents) */
                    throw error;
                }
            })
            .then(settings => {
                updateFunction(settings);
                return this.saveSettings(settings);
            });
    }

    /**
     * Remove cached settings object, for use in tests
     */
    public static forgetSettings(): void {
        Settings.settings = null;
    }

    public static loadSettingsOrReturnEmpty(): Q.Promise<Settings.ISettings> {
        return Settings.loadSettings().fail(function (): Settings.ISettings { return { remotePlatforms: {} }; });
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
        var optionsToIgnore = options.original.indexOf("--") === -1 ? [] : options.original.slice(options.original.indexOf("--"));
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
    public static determinePlatformsFromOptions(options: commands.ICommandData): Q.Promise<Settings.IPlatformWithLocation[]> {
        return this.loadSettingsOrReturnEmpty().then((settings: Settings.ISettings) => {
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

            return remotePlatforms.map(function (platform: string): Settings.IPlatformWithLocation {
                return { location: Settings.BuildLocationType.Remote, platform: platform };
            }).concat(localPlatforms.map(function (platform: string): Settings.IPlatformWithLocation {
                return { location: Settings.BuildLocationType.Local, platform: platform };
            }));
        }).then((platforms: Settings.IPlatformWithLocation[]) => {
            var requestedPlatforms = Settings.parseRequestedPlatforms(options);

            if (requestedPlatforms.length > 0) {
                // Filter down to user-requested platforms if appropriate
                return requestedPlatforms.map((platform: string): Settings.IPlatformWithLocation => {
                    if (!options.options["local"] && platforms.some((p: Settings.IPlatformWithLocation): boolean => {
                        return p.platform === platform && p.location === Settings.BuildLocationType.Remote;
                    })) {
                        // If we found a remote configuration for the platform default to using that
                        return { platform: platform, location: Settings.BuildLocationType.Remote };
                    } else {
                        // Otherwise if the --local flag was given or no remote was configured, use the platform locally
                        return { platform: platform, location: Settings.BuildLocationType.Local };
                    }
                });
            }

            // Otherwise return all the platforms we found.
            return platforms;
        }).then((platforms: Settings.IPlatformWithLocation[]) => {
            return platforms.filter((platform: Settings.IPlatformWithLocation) => {
                // If the user specified --remote, then any local platforms at this point
                // Must be user-specified and non-configured, so warn about them.
                if (options.options["remote"] && platform.location === Settings.BuildLocationType.Local) {
                    logger.logWarning(resources.getString("NoRemoteConfigurationFoundForPlatform", platform.platform));
                    return false;
                }
                return true;
            });
        });
    }
}

module Settings {
    export interface IRemoteConnectionInfo {
        host: string;
        port: number;
        secure: boolean;
        certName?: string;
        mountPoint: string;
    }

    export interface ISettings {
        remotePlatforms?: {
            [platform: string]: IRemoteConnectionInfo
        };
        language?: string;
        lastCheckForNewerVersionTimestamp?: number;
    }

    export enum BuildLocationType {
        Local,
        Remote
    }

    export interface IPlatformWithLocation {
        platform: string;
        location: BuildLocationType;
    }
}

export = Settings;
