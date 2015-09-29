/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

import tacoUtility = require ("taco-utils");
import Settings = require ("./settings");
import Q = require ("q");

import commands = tacoUtility.Commands;
import ICommandTelemetryProperties = tacoUtility.ICommandTelemetryProperties;

var telemetryProperty = tacoUtility.TelemetryHelper.telemetryProperty;

class BuildTelemetryHelper {
    // We don't use CordovaHelper.getSupportedPlatforms() because we need to validate this even if 
    // cordova is not installed, and the white list is a good enough solution, so we just use it for all cases
    private static KnownPlatforms = ["android", "ios", "amazon-fireos", "blackberry10", "browser", "firefoxos",
        "windows", "windows8", "wp8", "www"];

    private static BuildAndRunNonPiiOptions = ["clean", "local", "remote", "debuginfo", "nobuild", "device", "emulator", "target", "debug", "release"];
    
    public static storePlatforms(telemetryProperties: ICommandTelemetryProperties, modifier: string,
        platforms: Settings.IPlatformWithLocation[], settings: Settings.ISettings): void {
        var baseName = "platforms." + modifier + ".";
        var remoteBaseName = baseName + "remote";

        if (platforms.length > 0) {
            this.encodePlatforms(telemetryProperties, baseName + "local", this.extractPlatformsList(platforms, Settings.BuildLocationType.Local));
        }

        var remotePlatforms = this.extractPlatformsList(platforms, Settings.BuildLocationType.Remote);
        if (remotePlatforms.length > 0) {
            this.encodePlatforms(telemetryProperties, remoteBaseName, remotePlatforms);
        }

        remotePlatforms.forEach(platform => {
            if (settings.remotePlatforms && settings.remotePlatforms[platform]) {
                telemetryProperties["platforms.remote." + platform + ".is_secure"] = telemetryProperty(settings.remotePlatforms[platform].secure, /*isPii*/ false);
            }
        });
    }

    public static addCommandLineBasedPropertiesForBuildAndRun(telemetryProperties: ICommandTelemetryProperties, knownOptions: Nopt.CommandData,
        commandData: commands.ICommandData): Q.Promise<ICommandTelemetryProperties> {
        return Settings.loadSettingsOrReturnEmpty().then(settings => {
            var properties = tacoUtility.TelemetryHelper.addPropertiesFromOptions(telemetryProperties, knownOptions, commandData.options, this.BuildAndRunNonPiiOptions);
            return Settings.determinePlatformsFromOptions(commandData).then((platforms: Settings.IPlatformWithLocation[]) => {
                var requestedPlatforms = Settings.parseRequestedPlatforms(commandData);
                var requestedUsedPlatforms = platforms.filter((platform: Settings.IPlatformWithLocation): boolean => requestedPlatforms.indexOf(platform.platform) !== -1);
                this.storePlatforms(properties, "requestedViaCommandLine", requestedUsedPlatforms, settings);
                return properties;
            });
        });
    }

    public static getIsPlatformPii(): { (platform: string): boolean } {
        return platform => this.KnownPlatforms.indexOf(platform.toLocaleLowerCase()) < 0;
    }

    /*
     * Encode platform with pii or npii as required
     */
    private static encodePlatforms(telemetryProperties: ICommandTelemetryProperties, baseName: string, platforms: string[]): void {
        var platformIndex = 1; // This is a one-based index
        platforms.forEach(platform => {
            telemetryProperties[baseName + platformIndex++] = telemetryProperty(platform, BuildTelemetryHelper.getIsPlatformPii()(platform));
        });
    }

    private static extractPlatformsList(platforms: Settings.IPlatformWithLocation[], buildLocationType: Settings.BuildLocationType): string[] {
        var filteredPlatforms = platforms.filter(platform => platform.location === buildLocationType);
        return filteredPlatforms.map(platform => platform.platform);
    }
}

export = BuildTelemetryHelper;
