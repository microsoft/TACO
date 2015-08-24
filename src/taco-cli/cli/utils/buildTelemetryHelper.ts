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

var telemetryProperty = tacoUtility.TelemetryHelper.telemetryProperty;

module BuildTelemetryHelper {
    import ICommandTelemetryProperties = tacoUtility.ICommandTelemetryProperties;

    function extractPlatformsList(platforms: Settings.IPlatformWithLocation[], buildLocationType: Settings.BuildLocationType): string[] {
        var filteredPlatforms = platforms.filter(platform => platform.location === buildLocationType);
        return filteredPlatforms.map(platform => platform.platform);
    }

    // We don't use CordovaHelper.getSupportedPlatforms() because we need to validate this even if 
    // cordova is not installed, and the white list is a good enough solution, so we just use it for all cases
    var knownPlatforms = ["android", "ios", "amazon-fireos", "blackberry10", "browser", "firefoxos",
        "windows", "windows8", "wp8", "www"];
    
    /*
     * Encode platform with pii or npii as required
     */
    function encodePlatforms(telemetryProperties: ICommandTelemetryProperties, baseName: string, platforms: string[]): void {
        var platformIndex = 1; // This is a one-based index
        platforms.forEach(platform => {
            var isPii = knownPlatforms.indexOf(platform.toLocaleLowerCase()) < 0;
            telemetryProperties[baseName + platformIndex++] = telemetryProperty(platform, isPii);
        });
    }

    export function storePlatforms(telemetryProperties: ICommandTelemetryProperties, modifier: string,
        platforms: Settings.IPlatformWithLocation[], settings: Settings.ISettings): void {
        var baseName = "platforms." + modifier + ".";
        var remoteBaseName = baseName + "remote";

        if (platforms.length > 0) {
            encodePlatforms(telemetryProperties, baseName + "local", extractPlatformsList(platforms, Settings.BuildLocationType.Local));
        }

        var remotePlatforms = extractPlatformsList(platforms, Settings.BuildLocationType.Remote);
        if (remotePlatforms.length > 0) {
            encodePlatforms(telemetryProperties, remoteBaseName, remotePlatforms);
        }

        remotePlatforms.forEach(platform => {
            if (settings.remotePlatforms && settings.remotePlatforms[platform]) {
                telemetryProperties["platforms.remote." + platform + ".is_secure"] = telemetryProperty(settings.remotePlatforms[platform].secure, /*isPii*/ false);
            }
        });
    }

    var buildAndRunNonPiiOptions = ["clean", "local", "remote", "debuginfo", "nobuild", "device", "emulator", "target", "debug", "release"];
    export function addCommandLineBasedPropertiesForBuildAndRun(telemetryProperties: ICommandTelemetryProperties, knownOptions: Nopt.CommandData,
        commandData: commands.ICommandData): Q.Promise<ICommandTelemetryProperties> {
        return Settings.loadSettingsOrReturnEmpty().then(settings => {
            var properties = tacoUtility.TelemetryHelper.addPropertiesFromOptions(telemetryProperties, knownOptions, commandData.options,
                buildAndRunNonPiiOptions);
            var platforms = Settings.determineSpecificPlatformsFromOptions(commandData, settings);
            storePlatforms(properties, "requestedViaCommandLine", platforms, settings);
            return properties;
        });
    }
}

export = BuildTelemetryHelper;
