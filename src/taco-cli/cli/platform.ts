/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/tacoUtils.d.ts" />
/// <reference path="../../typings/tacoKits.d.ts" />
/// <reference path="../../typings/node.d.ts" />

"use strict";

import Q = require ("q");

import KitHelper = require ("./utils/kitHelper");
import resources = require ("../resources/resourceManager");
import kitComponentCommand = require("./utils/kitComponentCommand");
import Settings = require ("./utils/settings");
import tacoUtility = require ("taco-utils");

import commands = tacoUtility.Commands;
import CordovaHelper = tacoUtility.CordovaHelper;
import CordovaWrapper = tacoUtility.CordovaWrapper;
import ICommandTelemetryProperties = tacoUtility.ICommandTelemetryProperties;
import IKitComponentCommandData = kitComponentCommand.IKitComponentCommandData;
import IKitComponentInfo = kitComponentCommand.IKitComponentInfo;
import KitComponentCommand = kitComponentCommand.KitComponentCommand;
import Logger = tacoUtility.Logger;
import LoggerHelper = tacoUtility.LoggerHelper;
type IPlatformCommandData = kitComponentCommand.IKitComponentCommandData<Cordova.ICordovaPlatformOptions>;

/**
 * Platform
 * 
 * Handles "taco platform"
 */
class Platform extends KitComponentCommand {
    public name: string = "platform";

    private static KNOWN_OPTIONS: Nopt.CommandData = {
        usegit: String,
        link: Boolean,
        save: Boolean,
    };

    private static SHORT_HANDS: Nopt.ShortFlags = {};
    private static KNOWN_SUBCOMMANDS: string[] = ["add", "remove", "list", "update", "check"];
    private static KNOWN_TARGETS_SUBCOMMANDS: string[] = ["add", "remove", "update"];

    public subcommands: commands.ISubCommand[] = [
        {
            // taco plaform add <platform>
            name: "add",
            run: commandData => this.add()
        },
        {
            // taco plaform list
            name: "list",
            run: commandData => this.list()
        },
        {
            // taco plaform remote/update/check <platform>
            name: "fallback",
            run: commandData => this.passthrough(),
            canHandleArgs: commandData => true
        },
    ];

    protected get knownOptions(): Nopt.CommandData {
        return Platform.KNOWN_OPTIONS;
    }

    protected get knownSubCommands(): string[] {
        return Platform.KNOWN_SUBCOMMANDS;
    }

    protected get shortFlags(): Nopt.ShortFlags {
        return Platform.SHORT_HANDS;
    }

    protected get knownTargetsSubCommands(): string[] {
        return Platform.KNOWN_TARGETS_SUBCOMMANDS;
    }

    protected getCommandOptions(commandData: commands.ICommandData): Cordova.ICordovaPlatformOptions {
        return <Cordova.ICordovaPlatformOptions>{
            usegit: commandData.options["usegit"],
            link: commandData.options["link"],
            save: commandData.options["save"],
        };
    }

    protected runCordovaCommand(targets: string[]): Q.Promise<any> {
        var commandData: IPlatformCommandData = <IPlatformCommandData>this.data;
        return CordovaWrapper.platform(commandData.subCommand, commandData, targets, commandData.commandOptions);
    }

    protected getConfigXmlVersionSpec(targetName: string, projectInfo: IProjectInfo): Q.Promise<string> {
        return CordovaHelper.getEngineVersionSpec(targetName, projectInfo);
    }

    protected editVersionOverrideInfo(platformInfos: IKitComponentInfo[], projectInfo: IProjectInfo): Q.Promise<any> {
        var infos: Cordova.ICordovaPlatformInfo[] = platformInfos.map(info => <Cordova.ICordovaPlatformInfo>{ name: info.name, spec: info.spec });
        return CordovaHelper.editEngineVersionSpecs(infos, projectInfo);
    }

    protected getKitOverride(platformName: string, kitId: string): Q.Promise<IKitComponentInfo> {
        return KitHelper.getPlatformOverridesForKit(kitId)
            .then(kitOverrides => {
                var version: string = "";
                var src: string = "";
                if (kitOverrides && kitOverrides[platformName]) {
                    version = kitOverrides[platformName].version;
                    src = kitOverrides[platformName].src;
                }
                return KitComponentCommand.makeKitComponentInfo(platformName, version, src);
            });
    }

    /**
     * Prints the platform addition/removal operation progress message
     */
    protected printInProgressMessage(platforms: string): void {
        var commandData: IPlatformCommandData = <IPlatformCommandData>this.data;
        switch (commandData.subCommand) {
            case "add": {
                Logger.log(resources.getString("CommandPlatformStatusAdding", platforms));
            }
                break;

            case "remove": {
                Logger.log(resources.getString("CommandPlatformStatusRemoving", platforms));
            }
                break;

            case "update": {
                Logger.log(resources.getString("CommandPlatformStatusUpdating", platforms));
                break;
            }
        }
    }

    /**
     * Prints the platform addition/removal operation success message
     */
    protected printSuccessMessage(platforms: string): void {
        var commandData: IPlatformCommandData = <IPlatformCommandData>this.data;
        switch (commandData.subCommand) {
            case "add": {
                Logger.log(resources.getString("CommandPlatformStatusAdded", platforms));

                // Print the onboarding experience
                Logger.log(resources.getString("OnboardingExperienceTitle"));
                LoggerHelper.logList(["HowToUseCommandInstallReqsPlugin",
                    "HowToUseCommandAddPlugin",
                    "HowToUseCommandSetupRemote",
                    "HowToUseCommandBuildPlatform",
                    "HowToUseCommandEmulatePlatform",
                    "HowToUseCommandRunPlatform"].map((msg: string) => resources.getString(msg)));

                ["",
                    "HowToUseCommandHelp",
                    "HowToUseCommandDocs"].forEach((msg: string) => Logger.log(resources.getString(msg)));
                break;
            }

            case "remove":
                Logger.log(resources.getString("CommandPlatformStatusRemoved", platforms));

                break;

            case "update":
                Logger.log(resources.getString("CommandPlatformStatusUpdated", platforms));
                break;

        }

    }
    private list(): Q.Promise<ICommandTelemetryProperties> {
        // platform list should include remotely configured platforms as well
        return Q.all<any>([this.passthrough(), Settings.loadSettingsOrReturnEmpty()])
            .spread((telemetryProperties, settings) => {
                var remotePlatforms: string[] = Object.keys(settings.remotePlatforms || {});
                Logger.log(resources.getString("PlatformListRemotePlatforms", remotePlatforms.join(",")));
                return telemetryProperties;
            });
    }
}

export = Platform;
