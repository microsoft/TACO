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

import fs = require("fs");
import os = require("os");
import path = require("path");
import Q = require("q");
import util = require("util");

import CordovaHelper = require("./cordovaHelper");
import resources = require("../../resources/resourceManager");
import TacoErrorCodes = require("../tacoErrorCodes");
import errorHelper = require("../tacoErrorHelper");
import tacoUtils = require("taco-utils");

import commands = tacoUtils.Commands;
import logger = tacoUtils.Logger;
import utils = tacoUtils.UtilHelper;

/*
 * A static class which is responsible for dealing with the TacoSettings.json file
 */
class Settings {
    private static Settings: Settings.ISettings = null;
    private static SettingsFileName = "TacoSettings.json";

    public static get settingsFile(): string {
        return path.join(utils.tacoHome, Settings.SettingsFileName);
    }

    /*
     * Load data from TACO_HOME/TacoSettings.json
     */
    public static loadSettings(): Q.Promise<Settings.ISettings> {
        if (Settings.Settings) {
            return Q(Settings.Settings);
        }

        try {
            Settings.Settings = JSON.parse(<any>fs.readFileSync(Settings.settingsFile));
            return Q(Settings.Settings);
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

    public static saveSettings(settings: Settings.ISettings): Q.Promise<any> {
        // save to TACO_HOME/TacoSettings.json and store as the cached version
        Settings.Settings = settings;
        utils.createDirectoryIfNecessary(utils.tacoHome);
        fs.writeFileSync(Settings.settingsFile, JSON.stringify(settings));
        return Q({});
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
        return Q.all([
            CordovaHelper.getSupportedPlatforms(),
            Settings.determinePlatformsFromOptions(options)
        ]).spread<Settings.IPlatformWithLocation[]>(function (supportedPlatforms: CordovaHelper.IDictionary<any>, platforms: Settings.IPlatformWithLocation[]): Settings.IPlatformWithLocation[] {
            var filteredPlatforms = platforms.filter(function (platform: Settings.IPlatformWithLocation): boolean {
                var supported = !supportedPlatforms || platform.platform in supportedPlatforms;
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
        Settings.Settings = null;
    }

    public static determineSpecificPlatformsFromOptions(options: commands.ICommandData, settings: Settings.ISettings): Settings.IPlatformWithLocation[] {
        var optionsToIgnore = options.original.slice(options.original.indexOf("--"));
        var platforms = options.remain.filter(function (platform: string): boolean { return optionsToIgnore.indexOf(platform) === -1 });

        if (platforms.length > 0) {
            // one or more specific platforms are specified. Determine whether they should be built locally, remotely, or local falling back to remote
            return platforms.map(function (platform: string): Settings.IPlatformWithLocation {
                var buildLocation: Settings.BuildLocationType;
                if (options.options["remote"]) {
                    buildLocation = Settings.BuildLocationType.Remote;
                } else if (options.options["local"]) {
                    buildLocation = Settings.BuildLocationType.Local;
                } else {                     
                    // we build remotely if either remote server is setup for the given platform or if the target platform cannot be built locally
                    buildLocation = (platform in settings.remotePlatforms) || !Settings.canBuildLocally(platform) ?
                        Settings.BuildLocationType.Remote : Settings.BuildLocationType.Local;
                }

                return { location: buildLocation, platform: platform };
            });
        }
    }

    public static loadSettingsOrReturnEmpty(): Q.Promise<Settings.ISettings> {
        return Settings.loadSettings().fail(function (): Settings.ISettings { return { remotePlatforms: {} }; });
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

    private static determinePlatformsFromOptions(options: commands.ICommandData): Q.Promise<Settings.IPlatformWithLocation[]> {
        return this.loadSettingsOrReturnEmpty()
            .then((settings: Settings.ISettings) => {
                if (options.remain.length > 0) {
                    // one or more specific platforms are specified. Determine whether they should be built locally, remotely, or local falling back to remote
                    return this.determineSpecificPlatformsFromOptions(options, settings);
                } else {
                    // No platform specified: try to do 'all' of them
                    var remotePlatforms: string[] = [];
                    if (!options.options["local"]) {
                        // If we are not only building locally, then we need to consider any remote-only builds we need to do
                        var remotePlatforms = Object.keys(settings.remotePlatforms);
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
                }
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
