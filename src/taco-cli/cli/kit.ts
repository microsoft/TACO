/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/cordovaExtensions.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />
/// <reference path="../../typings/tacoUtils.d.ts" />
/// <reference path="../../typings/tacoKits.d.ts" />
"use strict";

import nopt = require ("nopt");
import path = require ("path");
import Q = require ("q");

import errorHelper = require ("./tacoErrorHelper");
import projectHelper = require ("./utils/projectHelper");
import resources = require ("../resources/resourceManager");
import TacoErrorCodes = require ("./tacoErrorCodes");
import tacoKits = require ("taco-kits");
import tacoUtility = require ("taco-utils");

import commands = tacoUtility.Commands;
import kitHelper = tacoKits.KitHelper;
import logger = tacoUtility.Logger;
import level = logger.Level;
import indent = logger.Indent;
import tacoProjectHelper = projectHelper.TacoProjectHelper;

/**
 * kit
 *
 * handles "taco kit"
 */
class Kit extends commands.TacoCommandBase implements commands.IDocumentedCommand {
    private static KnownOptions: Nopt.CommandData = {
        json: Boolean,
        cli: String
    };
    private static ShortHands: Nopt.ShortFlags = {};

    private static IndentWidth: number = 3; // indent string
    private static MaxTextWidth: number = 40;

    public subcommands: commands.ICommand[] = [
        {
            // List kits
            run: Kit.list,
            canHandleArgs(commandData: commands.ICommandData): boolean {
                return !commandData.remain[0] || commandData.remain[0] && commandData.remain[0].toLowerCase() === "list";
            }
        },
    ];

    public name: string = "kit";
    public info: commands.ICommandInfo;

    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
        return true;
    }

    public parseArgs(args: string[]): commands.ICommandData {
        var parsedOptions = tacoUtility.ArgsHelper.parseArguments(Kit.KnownOptions, Kit.ShortHands, args, 0);

        // Raise errors for invalid command line parameter combinations
        if (parsedOptions.options["json"] && parsedOptions.options["cli"]) {
            throw errorHelper.get(TacoErrorCodes.CommandKitInvalidCommandCombination);
        }

        return parsedOptions;
    }

     /**
      * Pretty prints the current Kit/Cordova CLI info
      */
    private static printCurrentKitInfo(): Q.Promise<any> {
        logger.log("\n");
        return tacoProjectHelper.getProjectInfo(path.resolve(".")).then(function (projectInfo: projectHelper.IProjectInfo): void {
            if (!projectInfo.isTacoProject) {
                return;
            }

            if (projectInfo.tacoKitId) {
                logger.log(resources.getString("CommandKitListCurrentKit"), level.NormalBold);
                logger.log(projectInfo.tacoKitId + "\n");
            }

            logger.log(resources.getString("CommandKitListCurrentCordovaCli"), level.NormalBold);
            logger.log(projectInfo.cordovaCliVersion + "\n");
        });
    }

     /**
      * Pretty prints the Kit name and description info
      */
    private static printKitNameAndDescription(kitId: string, kitInfo: tacoKits.IKitInfo): void {
        var title: string = kitId;
        var titleLength: number = title.length;
        logger.log("\n");
        logger.log(title, level.Success);
        if (!!kitInfo.default) {
            logger.log(resources.getString("CommandKitListDefaultKit"), level.Warn);
            titleLength += resources.getString("CommandKitListDefaultKit").length;
        } else if (!!kitInfo.deprecated) {
            logger.log(resources.getString("CommandKitListDeprecatedKit"), level.Error);
            titleLength += resources.getString("CommandKitListDeprecatedKit").length;
        }

        logger.log("\n");
        logger.logRepeatedString("-", titleLength, level.Normal);
        logger.log("\n");

        if (kitInfo.name) {
            logger.logLine(kitInfo.name + "\n", level.Normal); 
        }

        if (kitInfo.description) {
            logger.logLine(kitInfo.description + "\n", level.Normal);
        }
    }

     /**
      * Pretty prints the Cordova CLI version info
      */
    private static printCordovaCliVersion(kitInfo: tacoKits.IKitInfo): void {
        if (kitInfo["cordova-cli"]) {
            logger.log("\n");
            logger.log(resources.getString("CommandKitListCordovaCliForKit"), level.NormalBold);
            logger.log(kitInfo["cordova-cli"] + "\n", level.Normal);
            logger.log("\n");
        }
    }

     /**
      * Pretty prints the platform version override info
      */
    private static printPlatformOverrideInfo(kitInfo: tacoKits.IKitInfo): void {
        if (kitInfo.platforms) {
            logger.logLine(resources.getString("CommandKitListPlatformOverridesForKit"), level.NormalBold);
            Object.keys(kitInfo.platforms).forEach(function (platformName: string): void {
                var remain: number = Kit.MaxTextWidth - (platformName.length + Kit.IndentWidth);
                var versionInfo = kitInfo.platforms[platformName].version ? kitInfo.platforms[platformName].version : kitInfo.platforms[platformName].src;
                logger.logIndentedString(platformName, Kit.IndentWidth, indent.Left, level.Normal);
                logger.logRepeatedString(".", remain, level.Normal); 
                logger.log(": " + versionInfo + "\n", level.Normal);
            });
            logger.log("\n"); 
        }
    }

     /**
      * Pretty prints the plugin version override info
      */
    private static printPluginOverrideInfo(kitInfo: tacoKits.IKitInfo): void {
        if (kitInfo.plugins) {
            logger.logLine(resources.getString("CommandKitListPluginOverridesForKit"), level.NormalBold);
            Object.keys(kitInfo.plugins).forEach(function (pluginId: string): void {
                var remain: number = Kit.MaxTextWidth - (pluginId.length + Kit.IndentWidth);
                var versionInfo = kitInfo.plugins[pluginId].version ? kitInfo.plugins[pluginId].version : kitInfo.plugins[pluginId].src;
                logger.logIndentedString(pluginId, Kit.IndentWidth, indent.Left, level.Normal);
                logger.logRepeatedString(".", remain, level.Normal);
                logger.log(": " + versionInfo + "\n", level.Normal);
            });
            logger.log("\n"); 
        }
    }

    private static printKitsInfo(): Q.Promise<any> {
        logger.logLine("\n" + resources.getString("CommandKitList") + "\n", level.Normal);
        return kitHelper.getKitMetadata().then(function (metadata: tacoKits.ITacoKitMetadata): Q.Promise<tacoKits.IKitMetadata> {
            return Q.resolve(metadata.kits);
        }).then(function (kits: tacoKits.IKitMetadata): Q.Promise<any> {
            Object.keys(kits).forEach(function (kitId: string): void {
                if (kitId) {
                    kitHelper.getKitInfo(kitId).then(function (kitInfo: tacoKits.IKitInfo): void {
                        Kit.printKitNameAndDescription(kitId, kitInfo);
                        Kit.printCordovaCliVersion(kitInfo);
                        Kit.printPlatformOverrideInfo(kitInfo);
                        Kit.printPluginOverrideInfo(kitInfo);
                    });
                }
            });
            return Q({});
        });
    }

    private static list(commandData: commands.ICommandData): Q.Promise<any> {
        return Kit.printCurrentKitInfo().then(function (): Q.Promise<any> {
            return Kit.printKitsInfo();
        });
    }
}

export = Kit;
