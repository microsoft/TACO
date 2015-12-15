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
/// <reference path="../../typings/dictionary.d.ts" />

"use strict";

import Q = require ("q");

import KitHelper = require ("./utils/kitHelper");
import resources = require ("../resources/resourceManager");
import cordovaComponentCommand = require("./utils/cordovaComponentCommand");
import tacoUtility = require ("taco-utils");

import commands = tacoUtility.Commands;
import CordovaHelper = tacoUtility.CordovaHelper;
import CordovaWrapper = tacoUtility.CordovaWrapper;
import ICordovaComponentCommandData = cordovaComponentCommand.ICordovaComponentCommandData;
import ICordovaComponentInfo = cordovaComponentCommand.ICordovaComponentInfo;
import CordovaComponentCommand = cordovaComponentCommand.CordovaComponentCommand;
import Logger = tacoUtility.Logger;
import LoggerHelper = tacoUtility.LoggerHelper;

type IPluginCommandData = cordovaComponentCommand.ICordovaComponentCommandData<Cordova.ICordovaPluginOptions>;

/**
 * Plugin
 * 
 * Handles "taco plugin"
 */
class Plugin extends cordovaComponentCommand.CordovaComponentCommand {
    public name: string = "platform";

    private static KNOWN_OPTIONS: Nopt.CommandData = {
        searchpath: String,
        noregistry: String,
        variable: Array,
        browserify: Boolean,
        link: Boolean,
        save: Boolean,
        shrinkwrap: Boolean
    };

    private static SHORT_HANDS: Nopt.ShortFlags = {};
    private static KNOWN_SUBCOMMANDS: string[] = ["add", "remove", "list", "search", "check"];
    // list of subcommands which require a target (for e.g. a platform name or plugin id)
    private static KNOWN_TARGETS_SUBCOMMANDS: string[] = ["add", "remove", "update"];

    public subcommands: commands.ISubCommand[] = [
        {
            // taco plaform add <platform>
            name: "add",
            run: commandData => this.add()
        },
        {
            // taco plaform remote/update/check <platform>
            name: "fallback",
            run: commandData => this.passthrough(),
            canHandleArgs: commandData => true
        },
    ];

    protected get knownOptions(): Nopt.CommandData {
        return Plugin.KNOWN_OPTIONS;
    }

    protected get knownSubCommands(): string[] {
        return Plugin.KNOWN_SUBCOMMANDS;
    }

    protected get shortFlags(): Nopt.ShortFlags {
        return Plugin.SHORT_HANDS;
    }

    protected get knownTargetsSubCommands(): string[] {
        return Plugin.KNOWN_TARGETS_SUBCOMMANDS;
    }

    protected getCommandOptions(commandData: commands.ICommandData): Cordova.ICordovaPluginOptions {
        // Sanitize the --variable option flags
        var variables: string[] = commandData.options["variable"] || [];
        var cli_variables: Cordova.IKeyValueStore<string> = {}
        variables.forEach(function(variable: string): void {
            var keyval: any[] = variable.split("=");
            cli_variables[keyval[0].toUpperCase()] = keyval[1];
        });

        return <Cordova.ICordovaPluginOptions>{
            searchpath: commandData.options["searchpath"],
            noregistry: commandData.options["noregistry"],
            cli_variables: cli_variables,
            browserify: commandData.options["browserify"],
            link: commandData.options["link"],
            save: commandData.options["save"],
            shrinkwrap: commandData.options["shrinkwrap"]
        };
    }

    protected runCordovaCommand(targets: string[]): Q.Promise<any> {
        var commandData: IPluginCommandData = <IPluginCommandData>this.data;
        return CordovaWrapper.plugin(commandData.subCommand, commandData, targets, commandData.commandOptions);
    }

    protected getConfigXmlVersionSpec(targetName: string, projectInfo: IProjectInfo): Q.Promise<string> {
        return CordovaHelper.getPluginVersionSpec(targetName, projectInfo);
    }

    protected editVersionOverrideInfo(pluginInfos: ICordovaComponentInfo[], projectInfo: IProjectInfo): Q.Promise<any> {
        var commandData: IPluginCommandData = <IPluginCommandData>this.data;
        var infos: Cordova.ICordovaPluginInfo[] = pluginInfos.map(pluginInfo => {
            return <Cordova.ICordovaPluginInfo>{
                name: pluginInfo.name,
                spec: pluginInfo.spec,
                pluginVariables: commandData.commandOptions.cli_variables
            };
        })
        return CordovaHelper.editEngineVersionSpecs(infos, projectInfo);
    }

    protected getKitOverride(pluginId: string, kitId: string): Q.Promise<ICordovaComponentInfo> {
        return KitHelper.getPluginOverridesForKit(kitId)
            .then(kitOverrides => {
                var version: string = "";
                var src: string = "";
                if (kitOverrides && kitOverrides[pluginId]) {
                    version = kitOverrides[pluginId].version;
                    src = kitOverrides[pluginId].src;

                    if (kitOverrides[pluginId]["supported-platforms"]) {
                        Logger.log(resources.getString("CommandPluginTestedPlatforms", pluginId, kitOverrides[pluginId]["supported-platforms"]));
                    }
                }
                return CordovaComponentCommand.makeCordovaComponentInfo(pluginId, version, src);
            });
    }

    /**
     * Prints the platform addition/removal operation progress message
     */
    protected printInProgressMessage(plugins: string): void {
        // no progress shown for plugin operations
    }

    /**
     * Prints the plugin operations success message
     */
    protected printSuccessMessage(plugins: string): void {
        var commandData: IPluginCommandData = <IPluginCommandData>this.data;
        switch (commandData.subCommand) {
            case "add": {
                Logger.log(resources.getString("CommandPluginWithIdStatusAdded", plugins));

                // Print the onboarding experience
                Logger.log(resources.getString("OnboardingExperienceTitle"));
                LoggerHelper.logList(["HowToUseCommandInstallReqsPlugin",
                    "HowToUseCommandSetupRemote",
                    "HowToUseCommandBuildPlatform",
                    "HowToUseCommandEmulatePlatform",
                    "HowToUseCommandRunPlatform"].map((msg: string) => resources.getString(msg)));

                ["",
                    "HowToUseCommandHelp",
                    "HowToUseCommandDocs"].forEach((msg: string) => Logger.log(resources.getString(msg)));
                break;
            }

            case "remove": {
                Logger.log(resources.getString("CommandPluginStatusRemoved", plugins));
                break;
            }

            case "update": {
                Logger.log(resources.getString("CommandPluginStatusUpdated", plugins));
                break;
            }
        }
    }
}

export = Plugin;
