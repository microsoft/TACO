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

import assert = require("assert");
import fs = require("fs");
import nopt = require("nopt");
import path = require("path");
import Q = require("q");

import errorHelper = require("./tacoErrorHelper");
import projectHelper = require("./utils/project-helper");
import resources = require("../resources/resourceManager");
import TacoErrorCodes = require("./tacoErrorCodes");
import tacoKits = require("taco-kits");
import tacoUtility = require("taco-utils");

import commands = tacoUtility.Commands;
import kitHelper = tacoKits.KitHelper;
import logger = tacoUtility.Logger;
import level = logger.Level;
import tacoProjectHelper = projectHelper.TacoProjectHelper;

/*
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

    private static indentWidth: number = 3; // indent string
    private static maxTextWidth = 20;

    public subcommands: commands.ICommand[] = [
        {
            // List kits
            run: Kit.list,
            canHandleArgs(commandData: commands.ICommandData): boolean {
                return !commandData.options["json"];
            }
        },
    ];

    public name: string = "kit";
    public info: commands.ICommandInfo;

    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
        if (data.original.indexOf("--json") !== -1 && data.original.indexOf("--cli") === -1) {
            return false;
        }

        return true;
    }

    public parseArgs(args: string[]): commands.ICommandData {
        var parsedOptions = tacoUtility.ArgsHelper.parseArguments(Kit.KnownOptions, Kit.ShortHands, args, 0);

        // Raise errors for invalid command line parameters
        if (parsedOptions.options["json"] && parsedOptions.options["cli"]) {
            throw errorHelper.get(TacoErrorCodes.CommandNotBothLocalRemote);
        }

        return parsedOptions;
    }

     /**
     * Pretty prints the current Kit/Cordova CLI info
     */
    private static printCurrentKitInfo(): void {
        tacoProjectHelper.GetProjectInfo(__dirname).then(function (projectInfo: projectHelper.IProjectInfo): void {
            if (!projectInfo.isKitProject) {
                return;
            }

            if (projectInfo.tacoKitId) {
                logger.logLine(resources.getString("CommandKitListCurrentKit") + "\n", level.NormalBold);
                logger.log(projectInfo.tacoKitId);
            }
            logger.logLine(resources.getString("CommandKitListCurrentCordovaCli") + "\n", level.NormalBold);
            logger.log(projectInfo.cordovaCliVersion);
        });
    }

     /**
     * Pretty prints the Kit name and description info
     */
    private static printKitNameAndDescription(kitId: string, kitInfo: tacoKits.IKitInfo): void {
        if (kitId) {
            var title: string = kitId;
            var titleLength: number = title.length;
            logger.log("\n");
            logger.log(title, level.Success);
            if (kitInfo.default) {
                logger.log(resources.getString("CommandKitListDefaultKit") + "\n", level.Warn);
                titleLength += resources.getString("CommandKitListDefaultKit").length;
            }
            else if (kitInfo.deprecated) {
                logger.log(resources.getString("CommandKitListDeprecatedKit") + "\n", level.Error);
                titleLength += resources.getString("CommandKitListDeprecatedKit").length;
            }
            logger.log("\n");
            logger.RepeatString("-", titleLength, level.Normal);          
        }
        if (kitInfo.description) {
            var description: string = Kit.getLocalizedString(kitInfo.description);
            logger.logLine(description + "\n", level.Normal);
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
    private static  printPlatformOverrideInfo(kitInfo: tacoKits.IKitInfo): void {
        if (kitInfo.platforms) {
            logger.logLine(resources.getString("CommandKitListPlatformOverridesForKit"), level.NormalBold);
            Object.keys(kitInfo.platforms).forEach(function (platformName: string): void {
                var remain: number = Kit.maxTextWidth - (platformName.length + Kit.indentWidth);
                var versionInfo = kitInfo.platforms[platformName].version ? kitInfo.platforms[platformName].version : kitInfo.platforms[platformName].src;
                logger.RepeatString(" ", Kit.indentWidth, level.Normal); 
                logger.log(platformName, level.Warn);
                logger.RepeatString("-", remain, level.Normal); 
                logger.log(": " + versionInfo + "\n", level.Normal);
            });
        }
    }

     /**
     * Pretty prints the plugin version override info
     */
    private static printPluginOverrideInfo(kitInfo: tacoKits.IKitInfo): void {
        if (kitInfo.plugins) {
            logger.logLine(resources.getString("CommandKitListPluginOverridesForKit"), level.NormalBold);
            Object.keys(kitInfo.plugins).forEach(function (pluginId: string): void {
                var remain: number = Kit.maxTextWidth - (pluginId.length + Kit.indentWidth);
                var versionInfo = kitInfo.plugins[pluginId].version ? kitInfo.plugins[pluginId].version : kitInfo.plugins[pluginId].src;
                logger.RepeatString(" ", Kit.indentWidth, level.Normal);
                logger.log(pluginId, level.Warn);
                logger.RepeatString("-", remain, level.Normal);
                logger.log(": " + versionInfo + "\n", level.Normal);
            });
        }
    }

     /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    private static getLocalizedString(localizedStringObj: tacoKits.ILocalizableString): string {
        return localizedStringObj["default"];
    }

    private static printKitsInfo(): void {
        logger.logLine(resources.getString("CommandKitList") + "\n", level.Normal);
        kitHelper.getKitMetadata().then(function (metadata: tacoKits.ITacoKitMetadata): void {
            var kits: tacoKits.IKitMetadata = metadata.kits;
            Object.keys(kits).forEach(function (kitId: string): void {
                Kit.printKitNameAndDescription(kitId, kits[kitId]);
                Kit.printCordovaCliVersion(kits[kitId]);
                Kit.printPlatformOverrideInfo(kits[kitId]);
                Kit.printPluginOverrideInfo(kits[kitId]);
            });
        });
    }

    private static list(commandData: commands.ICommandData): Q.Promise<any> {
        Kit.printCurrentKitInfo();
        Kit.printKitsInfo();
        return Q({});
    }
}

export = Kit;
