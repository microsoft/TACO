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

import fs = require ("fs");
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
import utils = tacoUtility.UtilHelper;

/**
 * kit
 *
 * handles "taco kit"
 */
class Kit extends commands.TacoCommandBase implements commands.IDocumentedCommand {
    private static KnownOptions: Nopt.CommandData = {
        kit: String,
        json: String,
        cli: String
    };
    private static ShortHands: Nopt.ShortFlags = {};
    private static DefaultMetadataFileName: string = "KitMetadata.json";

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
            throw errorHelper.get(TacoErrorCodes.ErrorIncompatibleOptions, "--json", "--cli");
        }
        
        if (parsedOptions.options["cli"] && parsedOptions.options["kit"]) {
            throw errorHelper.get(TacoErrorCodes.ErrorIncompatibleOptions, "--cli", "--kit");
        }

        if (parsedOptions.options["kit"] && parsedOptions.options["json"]) {
            throw errorHelper.get(TacoErrorCodes.ErrorIncompatibleOptions, "--kit", "--json");
        }

        return parsedOptions;
    }

     /**
      * Pretty prints the current Kit/Cordova CLI info
      */
    private static getCurrentKitInfo(): Q.Promise<string> {
        var deferred = Q.defer<string>();
        return projectHelper.getProjectInfo().then(function (projectInfo: projectHelper.IProjectInfo): Q.Promise<string> {
            if (!projectInfo.isTacoProject) {
               deferred.resolve("");
            }

            if (projectInfo.tacoKitId) {
                logger.log(resources.getString("CommandKitListCurrentKit", projectInfo.tacoKitId));
                deferred.resolve(projectInfo.tacoKitId);
            }

            return deferred.promise;
        });
    }

    /**
     * Get kit title
     */
    private static getKitTitle(kitId: string, kitInfo: tacoKits.IKitInfo): string {
        var name: string = util.format("<kitid>%s</kitid>", kitId);
        if (!!kitInfo.default) {
            return util.format("%s <defaultkit>(%s)</defaultkit>", name, resources.getString("CommandKitListDefaultKit"));
        } else if (!!kitInfo.deprecated) {
            return util.format("%s <deprecatedkit>(%s) </deprecatedkit>", name, resources.getString("CommandKitListDeprecatedKit"));
        }

        return name;
    }

    /**
     * Get kit description
     */
    private static getKitDescription(kitInfo: tacoKits.IKitInfo): string {
        var kitDefaultDescription: string = "";

        if (kitInfo["cordova-cli"]) {
            kitDefaultDescription = resources.getString("CommandKitListDefaultDescription", kitInfo["cordova-cli"]);
        }

        return kitInfo.description ? kitInfo.description : kitDefaultDescription;
    }

    /**
     * Pretty prints title and description of all the known kits
     * Order is :
     * <current_kit> if within a Taco kit project
     * <default_kit>
     * <available_kit_1>
     * <available_kit_2>
     * <available_kit_3>
     * ...
     * <deprecated_kit_1>
     * <deprecated_kit_2>
     * ...
     */
    private static printAllKits(): Q.Promise<any> {
        var defaultKitDesc: INameDescription, currentKitDesc: INameDescription;
        var kitsToPrint: INameDescription[] = [];
        var deprecatedKits: INameDescription[] = [];
        var availableKits: INameDescription[] = [];
        var currentKitId: string = "";

        logger.log(resources.getString("CommandKitList"));
        logger.logLine();
        
        return Kit.getCurrentKitInfo().then(function (kitId: string): Q.Promise<any> {
            currentKitId = kitId;
            return Q.resolve({});
        })
            .then(function (): Q.Promise<any> {
            return kitHelper.getKitMetadata().then(function (meta: tacoKits.ITacoKitMetadata): Q.Promise<any> {
                return Q.all(Object.keys(meta.kits).map(function (kitId: string): Q.Promise<any> {
                    return kitHelper.getKitInfo(kitId).then(function (kitInfo: tacoKits.IKitInfo): Q.Promise<any> {                     
                        var kitNameDescription = {
                            name: Kit.getKitTitle(kitId, kitInfo),
                            description: Kit.getKitDescription(kitInfo)
                        };

                        if (kitId === currentKitId) {
                            currentKitDesc = kitNameDescription;
                        } else {
                            if (!!kitInfo.default) {
                                defaultKitDesc = kitNameDescription;
                            } else if (!!kitInfo.deprecated) {
                                deprecatedKits.push(kitNameDescription);
                            } else {
                                availableKits.push(kitNameDescription);
                            }
                        }

                        return Q.resolve({});
                    });
                }));
            });
        })
            .then(function (): Q.Promise<any> {
            if (currentKitDesc) {
                kitsToPrint.push(currentKitDesc);
            }

            if (defaultKitDesc) {
                kitsToPrint.push(defaultKitDesc);
            }

            kitsToPrint.push.apply(kitsToPrint, availableKits);
            kitsToPrint.push.apply(kitsToPrint, deprecatedKits);
            LoggerHelper.logNameDescriptionTable(kitsToPrint);
            return Q.resolve({});
        });
    }

    /**
     * Pretty prints the Kit name and description info
     */
    private static printKitNameAndDescription(kitId: string, kitInfo: tacoKits.IKitInfo): void {
        var title: string = Kit.getKitTitle(kitId, kitInfo);
        var kitDescription: string = Kit.getKitDescription(kitInfo);
        logger.log(util.format("%s<underline/>", title));
        logger.log(kitDescription);
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
            LoggerHelper.logNameDescriptionTable(
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
            LoggerHelper.logNameDescriptionTable(
                Object.keys(kitInfo.plugins).map(function (pluginId: string): INameDescription {
                    return <INameDescription>{
                        name: pluginId,
                        description: kitInfo.plugins[pluginId].version || kitInfo.plugins[pluginId].src
                    };
                }), LoggerHelper.DefaultIndent, valuesIndent);
            logger.logLine();
        }
    }

    /**
     * Pretty prints information (title, description, Cordova CLI version,
     * plugin/platform override info regardng a single kit
     */
    private static printKit(kitId: string): Q.Promise<any> {
        return kitHelper.getKitInfo(kitId).then(function (kitInfo: tacoKits.IKitInfo): void {
            var indent2 = LoggerHelper.getDescriptionColumnIndent(Kit.getLongestPlatformPluginLength(kitInfo));
            Kit.printKitNameAndDescription(kitId, kitInfo);
            Kit.printCordovaCliVersion(kitInfo);
            Kit.printPlatformOverrideInfo(kitInfo, indent2);
            Kit.printPluginOverrideInfo(kitInfo, indent2);
        });
    }

    /**
     * Save the metadata Json file
     * plugin/platform override info regardng a single kit
     */
    private static validateJsonFilePath(jsonFilePath: string): string {
        // Make sure the specified path is valid
        if (!utils.isPathValid(jsonFilePath)) {
            throw errorHelper.get(TacoErrorCodes.ErrorInvalidPath, jsonFilePath);
        }

        if (fs.existsSync(jsonFilePath)) {
            var stat = fs.statSync(jsonFilePath);
            if (stat.isDirectory()) {
             jsonFilePath = path.join(jsonFilePath, Kit.DefaultMetadataFileName);
            } else {
                // Make sure the file specified is not already present
                throw errorHelper.get(TacoErrorCodes.ErrorFileAlreadyExists, jsonFilePath);
            }
        } else {
            utils.createDirectoryIfNecessary(jsonFilePath);
            jsonFilePath = path.join(jsonFilePath, Kit.DefaultMetadataFileName);
        }

        return jsonFilePath;
    }

    /**
     * Save the metadata Json jsonFilePath
     * plugin/platform override info regardng a single kit
     */
    private static writeMetadataJsonFile(commandData: commands.ICommandData): Q.Promise<any> {
        var deferred: Q.Deferred<any> = Q.defer<any>();
        var jsonFilePath: string = commandData.options["json"];

        if (jsonFilePath) {
            jsonFilePath = Kit.validateJsonFilePath(jsonFilePath);
        } else {
            jsonFilePath = path.join(utils.tacoHome, Kit.DefaultMetadataFileName);
        }

        return kitHelper.getKitMetadata()
            .then(function (meta: tacoKits.ITacoKitMetadata): Q.Promise<any> {
            return projectHelper.createJsonFileWithContents(jsonFilePath, meta.kits); 
        })
            .then(function (): Q.Promise<any> {
            logger.log(resources.getString("CommandKitListJsonFileStatus", path.basename(jsonFilePath), path.dirname(jsonFilePath)));
            return Q.resolve({});
        });
    }

    private static getLongestPlatformPluginLength(kitInfo: tacoKits.IKitInfo): number {
        var longest: number = 0;
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
    }

    private static list(commandData: commands.ICommandData): Q.Promise<any> {
        logger.logLine();
        var kitId: string = commandData.options["kit"];
        var jsonPath: any = commandData.options["json"];

        if (typeof jsonPath !== "undefined") {
            return Kit.writeMetadataJsonFile(commandData);
        } else {
            // If the user requested for info regarding a particular kit, print all the information regarding the kit  
            // Else print minimal information about all the kits
            return kitId ? Kit.printKit(kitId) : Kit.printAllKits();
        }       
    }
}

export = Kit;