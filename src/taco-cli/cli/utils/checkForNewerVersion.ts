/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/request.d.ts" />

/* This is the ionic implementation of this feature: https://github.com/driftyco/ionic-cli/blob/195c06140d0c8179758d778ea78980e2371dfba6/lib/cli.js */

import tacoUtility = require ("taco-utils");
import Q = require ("q");
import resources = require ("../../resources/resourceManager");
import request = require ("request");
import settingsManager = require ("../utils/settings");
import semver = require ("semver");

import logger = tacoUtility.Logger;

class CheckForNewerVersion {
    private millisecondsInAnHour = 60 * 60 * 1000;
    private maximumCheckIntervalInHours = 4;
    private tacoCliNpmRepositoryUrl: string;
    private packageFilePath: string;
    private millisecondsUntilTimeout = 5 * 1000; /* We want this to be high, as to have time to get the response back,
        but not very high, because we'll be blocking the user console if this takes too long */

    constructor(tacoCliNpmRepositoryUrl: string = "http://registry.npmjs.org/taco-cli/latest", packageFilePath: string = "../../package.json") {
        this.tacoCliNpmRepositoryUrl = tacoCliNpmRepositoryUrl;
        this.packageFilePath = packageFilePath;
    }

    public showOnExit(): Q.Promise<boolean> {
        /* Pseudo-code:
            1. Get last time check was done from TacoSettings.json
            2. If last time check was done was long ago, then continue, if not stop.
            3. Obtain last version currently released from http://registry.npmjs.org/taco-cli/latest
            4. If current version < last released version then schedule printting warning message on beforeExit.
            5. Update the last time check was done on TacoSettings.json to Date.now()
        */

        return this.isCheckForUpdateNeeded() // 1.
            .then(isCheckForUpdateNeeded => {
                if (isCheckForUpdateNeeded) { // 2.
                    return this.getLatestVersion() // 3.
                        .then(latestVersion => this.printVersionWarningIfNeccesary(latestVersion)) // 4.
                        .then(() => this.updateLastTimeCheckWasDone()); // 5.
                } else {
                    return Q.resolve<boolean>(isCheckForUpdateNeeded);
                }
            });
    }

    public showOnExitAndIgnoreFailures(): void {
        try {
            this.showOnExit().catch(error => { }).done();
        } catch (e) {
            // We don't want to crash the app if there is a bug or error in this code
        }
    }

    private isCheckForUpdateNeeded(): Q.Promise<boolean> {
        var self = this;
        return settingsManager.loadSettings().then(settings => {
            var currentDate = new Date();
            if (settings.lastCheckForNewerVersionTimestamp) {
                var millisecondSinceLastCheck = currentDate.getTime() - new Date(settings.lastCheckForNewerVersionTimestamp).getTime();
                var isCheckForUpdateNeeded = millisecondSinceLastCheck > self.maximumCheckIntervalInHours * self.millisecondsInAnHour;
                // FOR DEBUGGING: The next line is only used while debugging this feature
                // logger.log("Last Check Time" + lastCheckTime + "Current date = " + currentDate + ", Last checked date = " + settings.lastCheckForNewerVersionTimestamp);
                return isCheckForUpdateNeeded;
            } else {
                // If the setting doesn't exist, we assume we've never checked it before
                return true;
            }
        }).fail(() => true);
    }

    private getLatestVersion(): Q.Promise<string> {
        var deferredLatestVersion = Q.defer<string>();
        var proxy = process.env.PROXY || process.env.http_proxy || null;
        request({ url: this.tacoCliNpmRepositoryUrl, json: true, proxy: proxy, timeout: this.millisecondsUntilTimeout }, (error: any, response: any, body: any) => {
            try {
                if (!error && response.statusCode === 200 && body.version) { // 200 is the 200 OK HTTP Code. See http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html
                    var latestVersion = body.version;
                    deferredLatestVersion.resolve(latestVersion);
                } else {
                    deferredLatestVersion.reject("error = " + error + ", status code = " + (response ? response.statusCode : "none") + ", body = " + body);
                }
            } catch (e) {
                deferredLatestVersion.reject(e);
            }
        });

        return deferredLatestVersion.promise;
    }

    private printVersionWarningIfNeccesary(latestVersion: string): void {
        var installedVersion: string = require(this.packageFilePath).version;
        if (semver.gt(latestVersion, installedVersion)) {
            // We want to print this just before exiting, so we subscribe to beforeExit: https://nodejs.org/api/process.html#process_event_exit
            process.on("beforeExit", () => {
                logger.log(resources.getString("NewerTacoCLIVersionAvailable", installedVersion, latestVersion));
            });
        } else {
            // FOR DEBUGGING: The next line is only used while debugging this feature
            // logger.log("There is no newer version. Installed Version = " + installedVersion + ", Latest Version = " + latestVersion);
        }
    }

    private updateLastTimeCheckWasDone(): Q.Promise<any> {
        return settingsManager.updateSettings(settings => settings.lastCheckForNewerVersionTimestamp = Date.now());
    }
}

export = CheckForNewerVersion
