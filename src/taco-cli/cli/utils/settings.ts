/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/tacoUtils.d.ts" />
/// <reference path="../../../typings/Q.d.ts" />
/// <reference path="../../../typings/nopt.d.ts" />
"use strict";

import fs = require ("fs");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import util = require("util");

import resources = require("../../resources/resourceManager");
import tacoUtils = require("taco-utils");

import commands = tacoUtils.Commands;
import utils = tacoUtils.UtilHelper;
import logger = tacoUtils.Logger;

/*
 * A static class which is responsible for dealing with the TacoSettings.json file
 */
class Settings {
    private static Settings: Settings.ISettings = null;
    private static SettingsFileName = "TacoSettings.json";

    /*
     * Load data from TACO_HOME/TacoSettings.json
     */
    public static loadSettings(suppressFailure?: boolean): Q.Promise<Settings.ISettings> {
        if (Settings.Settings) {
            return Q(Settings.Settings);
        }

        var settingsPath = path.join(utils.tacoHome, Settings.SettingsFileName);
        try {
            Settings.Settings = JSON.parse(<any>fs.readFileSync(settingsPath));
            return Q(Settings.Settings);
        } catch (e) {
            // Unable to read TacoSettings.json: it doesn't exist, or it is corrupt
            if (!suppressFailure) {
                logger.logErrorLine(resources.getString("command.build.tacoSettingsNotFound"));
            }

            return Q.reject<Settings.ISettings>(e);
        }
    }

    public static saveSettings(settings: Settings.ISettings): Q.Promise<any> {
        // save to TACO_HOME/TacoSettings.json and store as the cached version
        Settings.Settings = settings;
        var settingsPath = path.join(utils.tacoHome, Settings.SettingsFileName);
        utils.createDirectoryIfNecessary(utils.tacoHome);
        fs.writeFileSync(settingsPath, JSON.stringify(settings));
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
        return Settings.loadSettings(true)
        .fail(function (): Settings.ISettings { return { remotePlatforms: {} }; })
        .then(function (settings: Settings.ISettings): Settings.IPlatformWithLocation[] {
            if (options.remain.length > 0) {
                // one or more specific platforms are specified. Determine whether they should be built locally, remotely, or local falling back to remote
                return options.remain.map(function (platform: string): Settings.IPlatformWithLocation {
                    var buildLocation: Settings.BuildLocationType;
                    if (options.options["remote"]) {
                        buildLocation = Settings.BuildLocationType.Remote;
                    } else if (options.options["local"]) {
                        buildLocation = Settings.BuildLocationType.Local;
                    } else {
                        buildLocation = (platform in settings.remotePlatforms) ? Settings.BuildLocationType.Remote : Settings.BuildLocationType.Local;
                    }

                    return { location: buildLocation, platform: platform };
                });
            } else {
                // No platform specified: try to do 'all' of them
                var remotePlatforms: string[] = [];
                if (!options.options["local"]) {
                    // If we are not only building locally, then we need to consider any remote-only builds we need to do
                    var remotePlatforms = Object.keys(settings.remotePlatforms);
                }

                var localPlatforms: string[] = [];
                if (!options.options["remote"]) {
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

    /*
     * Construct the base URL for the given build server
     */
    public static getRemoteServerUrl(server: Settings.IRemoteConnectionInfo): string {
        return util.format("http%s://%s:%d/%s", server.secure ? "s" : "", server.host, server.port, server.mountPoint);
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
        language?: string
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