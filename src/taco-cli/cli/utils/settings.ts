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
import path = require ("path");
import Q = require ("q");
import util = require ("util");

import TacoErrorCodes = require ("../tacoErrorCodes");
import errorHelper = require ("../tacoErrorHelper");
import tacoUtils = require ("taco-utils");

import commands = tacoUtils.Commands;
import utils = tacoUtils.UtilHelper;

/*
 * A static class which is responsible for dealing with the TacoSettings.json file
 */
class Settings {
    private static settings: Settings.ISettings = null;
    private static SETTINGS_FILENAME: string = "TacoSettings.json";

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
            Settings.settings = JSON.parse(fs.readFileSync(Settings.settingsFile, "utf8"));
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
            .then((settings: Settings.ISettings) => {
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
}

export = Settings;
