/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/cordovaExtensions.d.ts" />
/// <reference path="../../typings/nameDescription.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />
/// <reference path="../../typings/tacoUtils.d.ts" />
/// <reference path="../../typings/tacoKits.d.ts" />
"use strict";

import nopt = require ("nopt");
import path = require ("path");
import Q = require ("q");
import util = require ("util");

import errorHelper = require ("./tacoErrorHelper");
import projectHelper = require ("./utils/projectHelper");
import resources = require ("../resources/resourceManager");
import TacoErrorCodes = require ("./tacoErrorCodes");
import tacoKits = require ("taco-kits");
import tacoUtility = require ("taco-utils");

import commands = tacoUtility.Commands;
import kitHelper = tacoKits.KitHelper;
import logger = tacoUtility.Logger;
import LoggerHelper = tacoUtility.LoggerHelper;
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
    private static printCurrentKitInfo(): Q.Promise<void> {
        logger.logLine();
        return tacoProjectHelper.getProjectInfo().then(function (projectInfo: projectHelper.IProjectInfo): void {
            if (!projectInfo.isTacoProject) {
                return;
            }

            if (projectInfo.tacoKitId) {
                logger.log(resources.getString("CommandKitListCurrentKit", projectInfo.tacoKitId));
            }

            logger.log(resources.getString("CommandKitListCurrentCordovaCli", projectInfo.cordovaCliVersion));
        });
    }

    /**
     * Pretty prints the Kit name and description info
     */
    private static printKitNameAndDescription(kitId: string, kitInfo: tacoKits.IKitInfo): void {
        var title: string = kitId;
        var titleLength: number = title.length;
        var suffix: string = "";

        if (!!kitInfo.default) {
            suffix = util.format("<defaultkit>(%s)</defaultkit>", resources.getString("CommandKitListDefaultKit"));
        } else if (!!kitInfo.deprecated) {
            suffix = util.format("<deprecatedkit>(%s)</deprecatedkit>", resources.getString("CommandKitListDeprecatedKit"));
        }

        logger.logLine();//
        logger.log(util.format("<kitid>%s</kitid> %s<underline/>", title, suffix));
        logger.log(kitInfo.name);
        logger.logLine();
        logger.log(kitInfo.description);
        logger.logLine();
    }

    /**
     * Pretty prints the Cordova CLI version info
     */
    private static printCordovaCliVersion(kitInfo: tacoKits.IKitInfo): void {
        if (kitInfo["cordova-cli"]) {
            logger.logLine();
            logger.log(resources.getString("CommandKitListCordovaCliForKit", kitInfo["cordova-cli"]));
            logger.logLine();
        }
    }

    /**
     * Pretty prints the platform version override info
     */
    private static printPlatformOverrideInfo(kitInfo: tacoKits.IKitInfo, valuesIndent: number): void {
        if (kitInfo.platforms) {
            logger.log(resources.getString("CommandKitListPlatformOverridesForKit"));
            LoggerHelper.logNameValueTable(
                Object.keys(kitInfo.platforms).map(function (platformName: string): INameDescription {
                    return <INameDescription>{
                        name: platformName,
                        description: kitInfo.platforms[platformName].version || kitInfo.platforms[platformName].src
                    };
                }), LoggerHelper.DefaultIndent, valuesIndent);
            logger.logLine();
        }
    }

    /**
     * Pretty prints the plugin version override info
     */
    private static printPluginOverrideInfo(kitInfo: tacoKits.IKitInfo, valuesIndent: number): void {
        if (kitInfo.plugins) {
            logger.log(resources.getString("CommandKitListPluginOverridesForKit"));
            LoggerHelper.logNameValueTable(
                Object.keys(kitInfo.plugins).map(function (pluginId: string): INameDescription {
                    return <INameDescription>{
                        name: pluginId,
                        description: kitInfo.plugins[pluginId].version || kitInfo.plugins[pluginId].src
                    };
                }), LoggerHelper.DefaultIndent, valuesIndent);
            logger.logLine();
        }
    }

    private static printKitsInfo(): Q.Promise<any> {
        logger.logLine();
        logger.log(resources.getString("CommandKitList"));
        return kitHelper.getKitMetadata().then(function (metadata: tacoKits.ITacoKitMetadata): Q.Promise<tacoKits.IKitMetadata> {
            return Q.resolve(metadata.kits);
        }).then(function (kits: tacoKits.IKitMetadata): Q.Promise<any> {
                return Kit.getLongestPlatformPluginLength(kits)
                    .then(function (maxLength: number): void {
                        var indent2 = Math.max(LoggerHelper.DefaultIndent + maxLength + LoggerHelper.MinimumDots + 2, LoggerHelper.MinRightIndent);
                        Object.keys(kits).forEach(function (kitId: string): void {
                            if (kitId) {
                                kitHelper.getKitInfo(kitId).then(function (kitInfo: tacoKits.IKitInfo): void {
                                    Kit.printKitNameAndDescription(kitId, kitInfo);
                                    Kit.printCordovaCliVersion(kitInfo);
                                    Kit.printPlatformOverrideInfo(kitInfo, indent2);
                                    Kit.printPluginOverrideInfo(kitInfo, indent2);
                                });
                            }
                        });
                });
        });
    }

    private static getLongestPlatformPluginLength(kits: tacoKits.IKitMetadata): Q.Promise<number> {
        return Object.keys(kits).reduce<Q.Promise<number>>(function (longest: Q.Promise<number>, kitId: string): Q.Promise<number> {
            return Q.all([longest, kitHelper.getKitInfo(kitId)]).spread<number>(function (longest: number, kitInfo: tacoKits.IKitInfo): number {
                if (kitInfo.platforms) {
                    longest = Object.keys(kitInfo.platforms).reduce(function (longest: number, platformName: string): number {
                        return Math.max(longest, platformName.length);
                    }, longest);
                }

                if (kitInfo.plugins) {
                    longest = Object.keys(kitInfo.plugins).reduce(function (longest: number, pluginId: string): number {
                        return Math.max(longest, pluginId.length);
                    }, longest);
                }

                return longest;
            });
        }, Q(0));
    }

    private static list(commandData: commands.ICommandData): Q.Promise<any> {
        return Kit.printCurrentKitInfo().then(function (): Q.Promise<any> {
            return Kit.printKitsInfo();
        });
    }
}

export = Kit;