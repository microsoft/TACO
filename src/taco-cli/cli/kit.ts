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

import assert = require ("assert");
import fs = require ("fs");
import nopt = require ("nopt");
import path = require ("path");
import Q = require ("q");
import util = require ("util");

import cordovaWrapper = require ("./utils/cordovaWrapper");
import errorHelper = require ("./tacoErrorHelper");
import platformModule = require ("./platform");
import pluginModule = require ("./plugin");
import projectHelper = require ("./utils/projectHelper");
import readline = require ("readline");
import resources = require ("../resources/resourceManager");
import TacoErrorCodes = require ("./tacoErrorCodes");
import tacoKits = require ("taco-kits");
import tacoUtility = require ("taco-utils");

import commands = tacoUtility.Commands;
import kitHelper = tacoKits.KitHelper;
import logger = tacoUtility.Logger;
import LoggerHelper = tacoUtility.LoggerHelper;
import utils = tacoUtility.UtilHelper;

var platform = new platformModule();
var plugin = new pluginModule();

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
        {
            // Local Run
            run: Kit.select,
            canHandleArgs(commandData: commands.ICommandData): boolean {
                return !commandData.remain[0] || commandData.remain[0] && commandData.remain[0].toLowerCase() === "select";
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
            deferred.resolve(projectInfo.tacoKitId || "");
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

        return kitInfo.description || kitDefaultDescription;
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
            var indent2 = LoggerHelper.getDescriptionColumnIndent(Kit.getLongestPlatformPluginLength(Object.keys(kitInfo.platforms), Object.keys(kitInfo.plugins)));
            Kit.printKitNameAndDescription(kitId, kitInfo);
            Kit.printCordovaCliVersion(kitInfo);
            Kit.printPlatformOverrideInfo(kitInfo, indent2);
            Kit.printPluginOverrideInfo(kitInfo, indent2);
        });
    }

    /**
     * Validates the file path passed. Throw appropriate errors if path passed is invalid.
     */
    private static validateJsonFilePath(jsonFilePath: string): void {
        assert(jsonFilePath);
        // Make sure the specified path is valid
        if (!utils.isPathValid(jsonFilePath)) {
            throw errorHelper.get(TacoErrorCodes.ErrorInvalidPath, jsonFilePath);
        }

        if (path.extname(jsonFilePath).toLowerCase() !== ".json") {
            throw errorHelper.get(TacoErrorCodes.ErrorInvalidJsonFilePath, jsonFilePath);
        }

        utils.createDirectoryIfNecessary(path.dirname(jsonFilePath));
    }

    /**
     * Save the metadata Json to path provided as argument to "--json" option
     */
    private static writeMetadataJsonFile(commandData: commands.ICommandData): Q.Promise<any> {
        var deferred: Q.Deferred<any> = Q.defer<any>();
        var jsonFilePath: string = commandData.options["json"];

        if (!jsonFilePath) {
            jsonFilePath = path.join(utils.tacoHome, Kit.DefaultMetadataFileName);
        }

        Kit.validateJsonFilePath(jsonFilePath);
        
        return kitHelper.getKitMetadata()
            .then(function (meta: tacoKits.ITacoKitMetadata): Q.Promise<any> {
            return projectHelper.createJsonFileWithContents(jsonFilePath, meta.kits); 
        })
            .then(function (): Q.Promise<any> {
            logger.log(resources.getString("CommandKitListJsonFileStatus", jsonFilePath));
            return Q.resolve({});
        });
    }

    private static getLongestPlatformPluginLength(platforms: string[], plugins: string[]): number {
        var longest: number = 0;
        if (platforms) {
                longest = platforms.reduce(function (longest: number, platformName: string): number {
                return Math.max(longest, platformName.length);
            }, longest);
        }

        if (plugins) {
            longest = plugins.reduce(function (longest: number, pluginId: string): number {
                        return Math.max(longest, pluginId.length);
            }, longest);
        }

        return longest;
    }

    /**
     * Updates the platforms and plugins added to the project - after a kit/cli change
     */
    private static updatePlatformsAndPlugins(installedPlatformVersions: projectHelper.IPlatformVersionInfo, installedPluginVersions: projectHelper.IPluginVersionInfo,
        platformVersionUpdates: projectHelper.IPlatformVersionInfo = null, pluginVersionUpdates: projectHelper.IPluginVersionInfo = null): Q.Promise<any> {
        return Kit.updatePlatforms(platformVersionUpdates || installedPlatformVersions)
        .then(function (): Q.Promise<any> {
            return Kit.updatePlugins(pluginVersionUpdates || installedPluginVersions);
        }).then(function (): void {
            logger.logLine();
            logger.log(resources.getString("CommandKitSelectStatusSuccess"));
        });
    }

    /**
     * Updates the platforms added to the project - Removes and adds platforms
     */
    private static updatePlatforms(platforms: projectHelper.IPlatformVersionInfo): Q.Promise<any> {
        if(Object.keys(platforms).length === 0)  {
            return Q({});
        }

        logger.log(resources.getString("CommandKitSelectStatusUpdatingPlatforms"));
        return Object.keys(platforms).reduce<Q.Promise<any>>(function (soFar: Q.Promise<any>, platformName: string): Q.Promise<any> {
            return soFar.then(function (): Q.Promise<any> {
                var platformRemoveCmdArg: string[] = ["remove", platformName, "--save"];
                var platformAddCmdArg: string[] = ["add", platformName];
                    return platform.run({
                        options: {},
                        original: platformRemoveCmdArg,
                        remain: platformRemoveCmdArg
                    }).then(function (): Q.Promise<any> {         
                    return platform.run({
                        options: {},
                        original: platformAddCmdArg,
                        remain: platformAddCmdArg
                    });
                });
            });
        }, Q({}));
    }

    /**
     * Updates the plugins added to the project - Removes and adds plugins
     */
    private static updatePlugins(plugins: projectHelper.IPluginVersionInfo, add: boolean = false): Q.Promise<any> {
        if(Object.keys(plugins).length === 0)  {
            return Q({});
        }

        logger.log(resources.getString("CommandKitSelectStatusUpdatingPlugins"));
        return Object.keys(plugins).reduce<Q.Promise<any>>(function (soFar: Q.Promise<any>, pluginName: string): Q.Promise<any> {
            return soFar.then(function (): Q.Promise<any> {
                var pluginRemoveCmdArg: string[] = ["remove", pluginName, "--save"];
                var pluginAddCmdArg: string[] = ["add", pluginName];
                    return plugin.run({
                        options: {},
                        original: pluginRemoveCmdArg,
                        remain: pluginRemoveCmdArg
                    }).then(function (): Q.Promise<any> {         
                    return platform.run({
                        options: {},
                        original: pluginAddCmdArg,
                        remain: pluginAddCmdArg
                    });
                });
            });
        }, Q({}));
    }

    /**
     * Returns the platform update info
     */
    private static getPlatformUpdateInfo(projectPath: string, kitId: string, installedPlatformInfo: projectHelper.IPlatformVersionInfo): Q.Promise<any> {
        var platformVersionUpdates: projectHelper.IPlatformVersionInfo = {};
        return kitHelper.getPlatformOverridesForKit(kitId)
        .then(function (platformOverrides: TacoKits.IPlatformOverrideMetadata): Q.Promise<any> {
            Object.keys(installedPlatformInfo).forEach(function (key: string): void {
                if (platformOverrides[key] && platformOverrides[key].version && platformOverrides[key].version !== installedPlatformInfo[key]) {
                    platformVersionUpdates[key] = platformOverrides[key].version;
                }
            });
            return Q.resolve(platformVersionUpdates);
        });
    }

    /**
     * Returns the plugin update info
     */
    private static getPluginUpdateInfo(projectPath: string, kitId: string, installedPluginInfo: projectHelper.IPluginVersionInfo): Q.Promise<any> {
        var pluginVersionUpdates: projectHelper.IPluginVersionInfo = {};
        return kitHelper.getPluginOverridesForKit(kitId)
        .then(function (pluginOverrides: TacoKits.IPluginOverrideMetadata): Q.Promise<any> {
            Object.keys(installedPluginInfo).forEach(function (key: string): void {
                if (pluginOverrides[key] && pluginOverrides[key].version && pluginOverrides[key].version !== installedPluginInfo[key]) {
                    pluginVersionUpdates[key] = pluginOverrides[key].version;
                }
            });
            return Q.resolve(pluginVersionUpdates);
        });
    }

    /**
     * Pretty prints the Cordova CLI version update info
     */
    private static printCordovaCliVersionUpdate(currentCli: string, newCli: string): void {
        assert(currentCli);
        assert(newCli);

        logger.logLine();
        logger.log(resources.getString("CommandKitListCordovaCliForKit", currentCli + " => " + newCli));
        logger.logLine();
    }

    /**
     * Pretty prints the platform and plugin update information
     */
    private static printProjectUpdateInfo(id: string, installedPlatformVersions: projectHelper.IPlatformVersionInfo, installedPluginVersions: projectHelper.IPluginVersionInfo,
        platformVersionUpdates: projectHelper.IPlatformVersionInfo = null, pluginVersionUpdates: projectHelper.IPluginVersionInfo = null): Q.Promise<any> {
        logger.logLine();
        var indent = LoggerHelper.getDescriptionColumnIndent(Kit.getLongestPlatformPluginLength(Object.keys(installedPluginVersions), Object.keys(installedPluginVersions)));
        
        var platformsRequireUpdate: boolean = Object.keys(platformVersionUpdates || installedPlatformVersions).length > 0 ? true : false;
        var pluginsRequireUpdate: boolean = Object.keys(platformVersionUpdates || installedPlatformVersions).length > 0 ? true : false;

        var deferred: Q.Deferred<any> = Q.defer<any>();
        if(platformsRequireUpdate || pluginsRequireUpdate) {
            if(platformVersionUpdates || pluginVersionUpdates) {
                logger.log(resources.getString("CommandKitSelectCliPreview", id));
            } else {
                logger.log(resources.getString("CommandKitSelectCliPreview", id));
            }

            if(platformsRequireUpdate) {
                Kit.printPlatformUpdateInfo(indent, installedPlatformVersions, platformVersionUpdates);
            }
            
            if(pluginsRequireUpdate) {
                Kit.printPlatformUpdateInfo(indent, installedPlatformVersions, pluginVersionUpdates);
            }
            
            logger.logWarning(resources.getString("CommandKitSelectProjectUpdateWarning"));
            deferred.resolve(true);
        }

        return deferred.promise;
    }

    private static printCliProjectUpdateInfo(cli: string, installedPlatformVersions: projectHelper.IPlatformVersionInfo, installedPluginVersions: projectHelper.IPluginVersionInfo): Q.Promise<any> {
        assert(installedPlatformVersions);
        assert(installedPluginVersions);
        return cordovaWrapper.getCordovaVersion().then(function (cordovaVersion: string): void {
            Kit.printCordovaCliVersionUpdate(cordovaVersion, cli)
            Kit.printProjectUpdateInfo(cli, installedPlatformVersions, installedPluginVersions);
        });
    }

    private static printKitProjectUpdateInfo(kitId: string, installedPlatformVersions: projectHelper.IPlatformVersionInfo, installedPluginVersions: projectHelper.IPluginVersionInfo, 
        platformVersionUpdates: projectHelper.IPlatformVersionInfo, pluginVersionUpdates: projectHelper.IPluginVersionInfo): Q.Promise<any> {
        assert(installedPlatformVersions);
        assert(installedPluginVersions);
        return kitHelper.getKitInfo(kitId).then(function (info: tacoKits.IKitInfo): Q.Promise<any> {
            return cordovaWrapper.getCordovaVersion().then(function (cordovaVersion: string): Q.Promise<any> {
                Kit.printCordovaCliVersionUpdate(cordovaVersion, info["cordova-cli"]);
                return Kit.printProjectUpdateInfo(kitId, installedPlatformVersions, installedPluginVersions, platformVersionUpdates, pluginVersionUpdates);
            });
        });
    }

    private static printPlatformUpdateInfo(indent: number, installedPlatformInfo: projectHelper.IPlatformVersionInfo, platformUpdateInfo: projectHelper.IPlatformVersionInfo = null): void {
        assert(installedPlatformInfo);
        logger.logLine();
        logger.log(resources.getString("CommandKitListPlatformOverridesForKit"));
        if(platformUpdateInfo) {
            LoggerHelper.logNameDescriptionTable(
                Object.keys(platformUpdateInfo).map(function (platformName: string): INameDescription {
                    return <INameDescription>{
                        name: platformName,
                        description: installedPlatformInfo[platformName] + " => " + platformUpdateInfo[platformName]
                    };
            }), LoggerHelper.DefaultIndent, indent);
        } else {
            LoggerHelper.logNameDescriptionTable(
                Object.keys(installedPlatformInfo).map(function (platformName: string): INameDescription {
                    return <INameDescription>{
                        name: platformName,
                        description: installedPlatformInfo[platformName] + " => [DEFAULT]"
                    };
            }), LoggerHelper.DefaultIndent, indent);
        }
        logger.logLine();
    }

    private static printPluginUpdateInfo(indent: number, installedPluginInfo: projectHelper.IPluginVersionInfo, pluginUpdateInfo: projectHelper.IPluginVersionInfo = null): void {
        assert(installedPluginInfo);
        logger.logLine();
        logger.log(resources.getString("CommandKitListPluginOverridesForKit"));
        if(pluginUpdateInfo) {
            LoggerHelper.logNameDescriptionTable(
                Object.keys(installedPluginInfo).map(function (pluginName: string): INameDescription {
                    return <INameDescription>{
                        name: pluginName,
                        description: installedPluginInfo[pluginName] + " => " + pluginUpdateInfo[pluginName]
                    };
            }), LoggerHelper.DefaultIndent, indent);
        } else {
            LoggerHelper.logNameDescriptionTable(
                Object.keys(installedPluginInfo).map(function (pluginName: string): INameDescription {
                    return <INameDescription>{
                        name: pluginName,
                        description: installedPluginInfo[pluginName] + " => [DEFAULT]"
                    };
            }), LoggerHelper.DefaultIndent, indent);
        }
        logger.logLine();
    }

    /**
     * Prompts the user with the prompt string and returns the response
     */
    public static promptUser(prompt: string): Q.Promise<string> {
        var deferred: Q.Deferred<any> = Q.defer<any>();
        var yesOrNoHandler = readline.createInterface({ input: process.stdin, output: process.stdout });

        yesOrNoHandler.question(prompt, function (answer: string): void {
            yesOrNoHandler.close();
            deferred.resolve(answer);
        });

        return deferred.promise;
    }

    /**
     * Changes the current kit used for the project at {projectPath} to {kitId}
     */
    private static selectKit(projectPath: string, kitId: string): Q.Promise<any> {
        var platformVersionUpdates: projectHelper.IPlatformVersionInfo;
        var installedPlatformVersions: projectHelper.IPlatformVersionInfo;
        var pluginVersionUpdates: projectHelper.IPluginVersionInfo;
        var installedPluginVersions: projectHelper.IPluginVersionInfo;
        var kitInfo: tacoKits.IKitInfo;
        
        return projectHelper.createTacoJsonFile(projectPath, true, kitId)
        .then(function (): Q.Promise<any> {
            return projectHelper.getInstalledPlatformVersions(projectPath)
        }).then(function (platformVersions: projectHelper.IPlatformVersionInfo): Q.Promise<any> {
            installedPlatformVersions = platformVersions;
            return projectHelper.getInstalledPluginVersions(projectPath);
        }).then(function (pluginVersions: projectHelper.IPluginVersionInfo): Q.Promise<any> {
            installedPluginVersions = pluginVersions;
           return Kit.getPlatformUpdateInfo(projectPath, kitId, installedPlatformVersions);
        }).then(function (platformVersions: projectHelper.IPluginVersionInfo): Q.Promise<any> {
            platformVersionUpdates = platformVersions;
           return Kit.getPluginUpdateInfo(projectPath, kitId, installedPlatformVersions);
        }).then(function (pluginVersions: projectHelper.IPluginVersionInfo): Q.Promise<any> {
            pluginVersionUpdates = pluginVersions;
            return Kit.printKitProjectUpdateInfo(kitId, installedPlatformVersions, installedPluginVersions, platformVersionUpdates, pluginVersionUpdates);
        }).then(function (projectRequiresUpdate: boolean): Q.Promise<any> {
            if(projectRequiresUpdate) {
                return Kit.promptUser(resources.getString("CommandKitSelectProjectUpdatePrompt"));
            } else {
                return Q.resolve("");
            }
        }).then(function (answer: string): Q.Promise<any> {
            if(answer && answer.length > 0 ) {
                answer = answer.toLowerCase();
                if (resources.getString("ProjectUpdatePromptResponseYes").split("\n").indexOf(answer) !== -1) {
                    logger.logLine();
                            
                    return Kit.updatePlatformsAndPlugins(installedPlatformVersions, installedPluginVersions, platformVersionUpdates, pluginVersionUpdates);
                }
            }
        });
    }
    
    /**
     * Changes the current Cordova CLI used for the project at {projectPath} to {cli}
     */
    private static selectCli(projectPath: string, cli: string): Q.Promise<any> {
        var installedPlatformVersions: projectHelper.IPlatformVersionInfo;
        var installedPluginVersions: projectHelper.IPluginVersionInfo;

        return projectHelper.createTacoJsonFile(projectPath, false, cli)
        .then(function (): Q.Promise<any> {
            return projectHelper.getInstalledPlatformVersions(projectPath)
        }).then(function (platformVersions: projectHelper.IPlatformVersionInfo): Q.Promise<any> {
            installedPlatformVersions = platformVersions;
            return projectHelper.getInstalledPluginVersions(projectPath);
        }).then(function (pluginVersions: projectHelper.IPluginVersionInfo): Q.Promise<any> {
            installedPluginVersions = pluginVersions;
            return Kit.printCliProjectUpdateInfo(cli, installedPlatformVersions, installedPluginVersions);
        }).then(function (projectRequiresUpdate: boolean): Q.Promise<any> {
            if(projectRequiresUpdate) {
                return Kit.promptUser(resources.getString("CommandKitSelectProjectUpdatePrompt"));
            } else {
                return Q.resolve("");
            }
        }).then(function (answer: string): Q.Promise<any> {
            if(answer && answer.length > 0 ) {
                answer = answer.toLowerCase();
                if (resources.getString("ProjectUpdatePromptResponseYes").split("\n").indexOf(answer) !== -1) {
                    logger.logLine();
                            
                    return Kit.updatePlatformsAndPlugins(installedPlatformVersions, installedPluginVersions);
                }
            }
        });
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

    private static select(commandData: commands.ICommandData): Q.Promise<any> {
        var kitId: string = commandData.options["kit"];
        var cli: string = commandData.options["cli"];
        var projectInfo: projectHelper.IProjectInfo;
        var projectPath: string = projectHelper.getProjectRoot();

        logger.logLine();

        return projectHelper.getProjectInfo().then(function (info: projectHelper.IProjectInfo): void {
            projectInfo = info;
            if(info.configXmlPath === "") {
                throw errorHelper.get(TacoErrorCodes.NotInCordovaProject);
            }
        })
            .then(function (): Q.Promise<any> {
            var usedkitId: string = projectInfo.tacoKitId;
            if (kitId) {
                if(usedkitId && usedkitId === kitId ) {
                    throw errorHelper.get(TacoErrorCodes.CommandKitProjectUsesSameKit, kitId);
                } else {
                    return Kit.selectKit(projectPath, kitId);
                }
            } else if (cli) {
                var usedCli: string = projectInfo.cordovaCliVersion;
                if(usedCli && usedCli === cli ) {
                    throw errorHelper.get(TacoErrorCodes.CommandKitProjectUsesSameCli, cli);
                } else {
                    return Kit.selectCli(projectPath, cli);
                }
            } else {
                throw errorHelper.get(TacoErrorCodes.CommandKitCliOrKitShouldBeSpecified);
            }
        });
    }
}

export = Kit;