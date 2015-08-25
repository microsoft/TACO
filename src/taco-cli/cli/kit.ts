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
import child_process = require ("child_process");
import fs = require ("fs");
import nopt = require ("nopt");
import path = require ("path");
import Q = require ("q");
import semver = require ("semver");
import util = require ("util");

import cordovaHelper = require ("./utils/cordovaHelper");
import cordovaWrapper = require ("./utils/cordovaWrapper");
import errorHelper = require ("./tacoErrorHelper");
import kitHelper = require ("./utils/kitHelper");
import projectHelper = require ("./utils/projectHelper");
import readline = require ("readline");
import resources = require ("../resources/resourceManager");
import TacoErrorCodes = require ("./tacoErrorCodes");
import tacoUtility = require ("taco-utils");

import commands = tacoUtility.Commands;
import logger = tacoUtility.Logger;
import LoggerHelper = tacoUtility.LoggerHelper;
import utils = tacoUtility.UtilHelper;

import IDictionary = cordovaHelper.IDictionary;

enum ProjectComponentType {
        Unknown = -1,
        Platform = 0,
        Plugin = 1
}

/**
 * kit
 *
 * handles "taco kit"
 */
class Kit extends commands.TacoCommandBase {
    private static KnownOptions: Nopt.CommandData = {
        kit: String,
        json: String,
        cli: String
    };

    private static IndentWidth: number = 3; // indent string
    private static MaxTextWidth: number = 40;
    private static DefaultMetadataFileName: string = "KitMetadata.json";
    private static ShortHands: Nopt.ShortFlags = {};

    public name: string = "kit";
    public info: commands.ICommandInfo;

    public subcommands: commands.ICommand[] = [
        {
            // List kits
            name: "list",
            run: Kit.list,
            canHandleArgs(commandData: commands.ICommandData): boolean {
                return !commandData.remain[0] || commandData.remain[0] && commandData.remain[0].toLowerCase() === "list";
            }
        },
        {
            // Change kit or CLI
            name: "select",
            run: Kit.select,
            canHandleArgs(commandData: commands.ICommandData): boolean {
                return !commandData.remain[0] || commandData.remain[0] && commandData.remain[0].toLowerCase() === "select";
            }
        },
    ];

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
     * Prompts for update and updates the project on a affirmative response
     */
    public static promptAndUpdateProject(updateProject: boolean, cliVersion: string, installedPlatformVersions: IDictionary<string>, installedPluginVersions: IDictionary<string>,
        platformVersionUpdates: IDictionary<string> = null, pluginVersionUpdates: IDictionary<string> = null): Q.Promise<any> {
        if (updateProject) {
            logger.logLine();
            return Kit.promptUser(resources.getString("CommandKitSelectProjectUpdatePrompt"))
            .then(function (answer: string): Q.Promise<any> {
                if (answer && answer.length > 0 ) {
                    answer = answer.toLowerCase();
                    if (resources.getString("PromptResponseYes").split("\n").indexOf(answer) !== -1) {
                        logger.logLine();
                        return Kit.updateProject(cliVersion, installedPlatformVersions, installedPluginVersions, platformVersionUpdates, pluginVersionUpdates);
                    }
                }
            });
        }
    
        return Q({});
    }

    /**
     * Get kit title
     */
    public static getKitTitle(kitId: string, kitInfo: TacoKits.IKitInfo): string {
        var name: string = util.format("<kitid>%s</kitid>", kitId);
        if (!!kitInfo.default) {
            return util.format("%s <defaultkit>(%s)</defaultkit>", name, resources.getString("CommandKitListDefaultKit"));
        } else if (!!kitInfo.deprecated) {
            return util.format("%s <deprecatedkit>(%s) </deprecatedkit>", name, resources.getString("CommandKitListDeprecatedKit"));
        }

        return name;
    }

    public parseArgs(args: string[]): commands.ICommandData {
        var parsedOptions = tacoUtility.ArgsHelper.parseArguments(Kit.KnownOptions, Kit.ShortHands, args, 0);

        // Raise errors for invalid command line parameter combinations
        if (parsedOptions.options.hasOwnProperty("json") && parsedOptions.options.hasOwnProperty("cli")) {
            throw errorHelper.get(TacoErrorCodes.ErrorIncompatibleOptions, "--json", "--cli");
        }
        
        if (parsedOptions.options.hasOwnProperty("cli") && parsedOptions.options.hasOwnProperty("kit")) {
            throw errorHelper.get(TacoErrorCodes.ErrorIncompatibleOptions, "--cli", "--kit");
        }

        if (parsedOptions.options.hasOwnProperty("json") && parsedOptions.options.hasOwnProperty("kit")) {
            throw errorHelper.get(TacoErrorCodes.ErrorIncompatibleOptions, "--kit", "--json");
        }

        return parsedOptions;
    }

    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
        return true;
    }

    private static generateTelemetryProperties(commandData: commands.ICommandData): Q.Promise<tacoUtility.ICommandTelemetryProperties> {
        return Q.when(tacoUtility.TelemetryHelper.addPropertiesFromOptions({}, Kit.KnownOptions, commandData.options, ["kit", "cli"]));
    }

    /**
     * Get kit description
     */
    private static getKitDescription(kitInfo: TacoKits.IKitInfo): string {
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

        return Kit.getCurrentKitInfo().then(function (kitId: string): Q.Promise<any> {
            currentKitId = kitId;
            if (kitId) {
                logger.log(resources.getString("CommandKitListCurrentKit", kitId));
                logger.logLine();
            }
            
            return Q.resolve({});
        })
            .then(function (): Q.Promise<any> {
            return kitHelper.getKitMetadata().then(function (meta: TacoKits.ITacoKitMetadata): Q.Promise<any> {
                return Q.all(Object.keys(meta.kits).map(function (kitId: string): Q.Promise<any> {
                    return kitHelper.getKitInfo(kitId).then(function (kitInfo: TacoKits.IKitInfo): Q.Promise<any> {                     
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
            logger.log(resources.getString("CommandKitList"));
            logger.logLine();
            LoggerHelper.logNameDescriptionTable(kitsToPrint);
            return Q.resolve({});
        });
    }

    /**
     * Pretty prints the Kit name and description info
     */
    private static printKitNameAndDescription(kitId: string, kitInfo: TacoKits.IKitInfo): void {
        var title: string = Kit.getKitTitle(kitId, kitInfo);
        var kitDescription: string = Kit.getKitDescription(kitInfo);
        logger.log(util.format("%s<underline/>", title));
        logger.log(kitDescription);
    }

    /**
     * Pretty prints the Cordova CLI version info
     */
    private static printCordovaCliVersion(kitInfo: TacoKits.IKitInfo): void {
        if (kitInfo["cordova-cli"]) {
            logger.logLine();
            logger.log(resources.getString("CommandKitListCordovaCliForKit", kitInfo["cordova-cli"]));
            logger.logLine();
        }
    }

    /**
     * Pretty prints the platform version override info
     */
    private static printPlatformOverrideInfo(kitInfo: TacoKits.IKitInfo, valuesIndent: number): void {
        if (kitInfo.platforms) {
            logger.log(resources.getString("CommandKitListPlatformOverridesForKit"));
            logger.logLine();
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
    private static printPluginOverrideInfo(kitInfo: TacoKits.IKitInfo, valuesIndent: number): void {
        if (kitInfo.plugins) {
            logger.log(resources.getString("CommandKitListPluginOverridesForKit"));
            logger.logLine();
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
     * Prints the release notes information for a kit
     */
    private static printReleaseNotesInformation(kitInfo: TacoKits.IKitInfo): void {
        if (kitInfo.releaseNotesUri && kitInfo.releaseNotesUri.length > 0) {
            logger.logLine();
            logger.log(resources.getString("CommandKitListReleaseNotes", kitInfo.releaseNotesUri));
        }
    }  

    /**
     * Validates the file path passed. Throw appropriate errors if path passed is invalid.
     */
    private static validateJsonFilePath(jsonFilePath: string): Q.Promise<any> {
        assert(jsonFilePath);
        // Make sure the specified path is valid
        if (!utils.isPathValid(jsonFilePath)) {
            throw errorHelper.get(TacoErrorCodes.ErrorInvalidPath, jsonFilePath);
        }

        if (path.extname(jsonFilePath).toLowerCase() !== ".json") {
            throw errorHelper.get(TacoErrorCodes.ErrorInvalidJsonFilePath, jsonFilePath);
        }

        if (fs.existsSync(jsonFilePath)) {
            return Kit.promptUser(resources.getString("CommandKitListJsonOverwritePrompt", jsonFilePath))
            .then(function (answer: string): void {
                if (answer && answer.length > 0 ) {
                    answer = answer.toLowerCase();
                    logger.logLine();
                    if (resources.getString("PromptResponseYes").split("\n").indexOf(answer) === -1) {
                        throw resources.getString("ErrorOperationCancelled");
                    }
                }
            });
        }

        utils.createDirectoryIfNecessary(path.dirname(jsonFilePath));
        return Q.resolve({});
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

        return Kit.validateJsonFilePath(jsonFilePath)
        .then(function (): Q.Promise<any> {
            return kitHelper.getKitMetadata();
        })
        .then(function (meta: TacoKits.ITacoKitMetadata): Q.Promise<any> {
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
     * Pretty prints information (title, description, Cordova CLI version,
     * plugin/platform override info regardng a single kit
     */
    private static printKit(kitId: string): Q.Promise<any> {
        return kitHelper.getKitInfo(kitId).then(function (kitInfo: TacoKits.IKitInfo): void {
            var indent = LoggerHelper.getDescriptionColumnIndent(Kit.getLongestPlatformPluginLength(kitInfo.platforms ? Object.keys(kitInfo.platforms) : null, kitInfo.plugins ? Object.keys(kitInfo.plugins) : null));
            Kit.printKitNameAndDescription(kitId, kitInfo);
            Kit.printCordovaCliVersion(kitInfo);
            Kit.printPlatformOverrideInfo(kitInfo, indent);
            Kit.printPluginOverrideInfo(kitInfo, indent);
            Kit.printReleaseNotesInformation(kitInfo);
        });
    }

    /**
     * Pretty prints the current Kit/Cordova CLI info
     */
    private static getCurrentKitInfo(): Q.Promise<string> {
        var deferred = Q.defer<string>();
        return projectHelper.getProjectInfo().then(function (projectInfo: projectHelper.IProjectInfo): Q.Promise<string> {
            deferred.resolve(projectInfo.tacoKitId);
            return deferred.promise;
        });
    }

    private static invokeComponentCommandSilent(cliVersion: string, component: string, subCommand: string, targets: string[], options: Cordova.ICordovaDownloadOptions): Q.Promise<any> {
        var commandParams: Cordova.ICordovaCommandParameters = {
            subCommand: subCommand,
            targets: targets,
            downloadOptions: options
        };
        return cordovaWrapper.invokePlatformPluginCommand(component, cliVersion, commandParams, null, true);
    }

    /**
     * Updates the project compoenents - plugins/platforms added to the project - Removes and adds platforms
     */
    private static updateComponents(cliVersion: string, components: IDictionary<string>, componentType: ProjectComponentType): Q.Promise<any> {
        assert(componentType === ProjectComponentType.Platform || componentType === ProjectComponentType.Plugin);
        if (!components || Object.keys(components).length === 0) {
            return Q({});
        }

        if (componentType === ProjectComponentType.Platform) {
            logger.log(resources.getString("CommandKitSelectStatusUpdatingPlatforms"));
        } else {
            logger.log(resources.getString("CommandKitSelectStatusUpdatingPlugins"));
        }

        return Object.keys(components).reduce<Q.Promise<any>>(function (soFar: Q.Promise<any>, componentName: string): Q.Promise<any> {
            return soFar.then(function (): Q.Promise<any> {
                var componentOverride: string = componentName + "@" + components[componentName];
                var downloadOptions: Cordova.ICordovaDownloadOptions = { searchpath: "", noregistry: false, usegit: false, cli_variables: {}, browserify: "", link: "", save: true, shrinkwrap: false };
                var command = (componentType === ProjectComponentType.Platform) ? "platform" : "plugin";
                return Kit.invokeComponentCommandSilent(cliVersion, command, "remove", [componentName], downloadOptions)
                .then(function (): Q.Promise<any> {    
                    downloadOptions.save = true;
                    return Kit.invokeComponentCommandSilent(cliVersion, command, "add", [componentOverride], downloadOptions);
                });
            });
        }, Q({}));

        logger.logLine();
    }

    /**
     * Updates the platforms and plugins added to the project - after a kit/cli change
     */
    private static updateProject(cliVersion: string, installedPlatformVersions: IDictionary<string>, installedPluginVersions: IDictionary<string>,
        platformVersionUpdates: IDictionary<string> = null, pluginVersionUpdates: IDictionary<string> = null): Q.Promise<any> {
        return Kit.updateComponents(cliVersion, platformVersionUpdates || installedPlatformVersions, ProjectComponentType.Platform)
        .then(function (): Q.Promise<any> {
            return Kit.updateComponents(cliVersion, pluginVersionUpdates || installedPluginVersions, ProjectComponentType.Plugin);
        });
    }

    /**
     * Returns the component (platform/plugin) update info
     */
    private static getComponentUpdateInfo(projectPath: string, kitId: string, installedComponentInfo: IDictionary<string>, componentType: ProjectComponentType = ProjectComponentType.Platform): Q.Promise<any> {
        assert(componentType === ProjectComponentType.Platform || componentType === ProjectComponentType.Plugin);
        var componentUpdates: IDictionary<string> = {};
        return kitHelper.getKitInfo(kitId).then(function (kitInfo: TacoKits.IKitInfo): Q.Promise<any> {
            var componentOverrides = (componentType === ProjectComponentType.Platform) ? kitInfo.platforms : kitInfo.plugins;
            if (!installedComponentInfo) {
                return Q.resolve({});
            }

            Object.keys(installedComponentInfo).forEach(function (key: string): void {
                if (componentOverrides && componentOverrides[key] && componentOverrides[key].version && componentOverrides[key].version !== installedComponentInfo[key]) {
                    componentUpdates[key] = componentOverrides[key].version;
                }
            });
            return Q.resolve(componentUpdates);
        });
    }

    /**
     * Pretty prints the Cordova CLI version update info
     */
    private static printCordovaCliUpdateInfo(currentCli: string, newCli: string): void {
        assert(currentCli);
        assert(newCli);

        if (currentCli === newCli) {
            return;
        }

        logger.logLine();
        logger.log(resources.getString("CommandKitListCordovaCliForKit", currentCli + " => " + newCli));
        logger.logLine();
    }

    private static projectComponentNeedsUpdate(installedComponentVersions: IDictionary<string>, componentVersionUpdates: IDictionary<string> = null): boolean {
        return (installedComponentVersions && Object.keys(componentVersionUpdates || installedComponentVersions).length > 0);
    }

    /**
     * Pretty prints the platform and plugin update information
     */
    private static printProjectUpdateInfo(id: string, installedPlatformVersions: IDictionary<string>, installedPluginVersions: IDictionary<string>,
        platformVersionUpdates: IDictionary<string> = null, pluginVersionUpdates: IDictionary<string> = null): void {
        var indent = LoggerHelper.getDescriptionColumnIndent(Kit.getLongestPlatformPluginLength(installedPlatformVersions ? Object.keys(installedPlatformVersions) : null, installedPluginVersions ? Object.keys(installedPluginVersions) : null));

        var platformsRequireUpdate: boolean = Kit.projectComponentNeedsUpdate(installedPlatformVersions, platformVersionUpdates);
        var pluginsRequireUpdate: boolean = Kit.projectComponentNeedsUpdate(installedPluginVersions, pluginVersionUpdates);
        
        if (platformsRequireUpdate || pluginsRequireUpdate) {
            if (platformVersionUpdates || pluginVersionUpdates) {
                logger.log(resources.getString("CommandKitSelectKitPreview", id));
            } else {
                logger.log(resources.getString("CommandKitSelectCliPreview", id));
            }

            if (platformsRequireUpdate) {
                logger.logLine();
                logger.log(resources.getString("CommandKitListPlatformOverridesForKit"));
                Kit.printUpdateInfo(indent, installedPlatformVersions, platformVersionUpdates, ProjectComponentType.Platform);
            }
            
            if (pluginsRequireUpdate) {
                logger.logLine();
                logger.log(resources.getString("CommandKitListPluginOverridesForKit"));
                Kit.printUpdateInfo(indent, installedPluginVersions, pluginVersionUpdates, ProjectComponentType.Plugin);
            }
            
            logger.log(resources.getString("CommandKitSelectProjectUpdateWarning"));
        }
    }

    private static printCliProjectUpdateInfo(currentCli: string, newCli: string, installedPlatformVersions: IDictionary<string>, installedPluginVersions: IDictionary<string>): void {
        Kit.printCordovaCliUpdateInfo(currentCli, newCli);
        Kit.printProjectUpdateInfo(newCli, installedPlatformVersions, installedPluginVersions);
    }

    private static printKitProjectUpdateInfo(currentCli: string, kitId: string, installedPlatformVersions: IDictionary<string>, installedPluginVersions: IDictionary<string>, 
        platformVersionUpdates: IDictionary<string>, pluginVersionUpdates: IDictionary<string>): Q.Promise<any> {
        return kitHelper.getKitInfo(kitId).then(function (info: TacoKits.IKitInfo): void {
            Kit.printCordovaCliUpdateInfo(currentCli, info["cordova-cli"]);
            Kit.printProjectUpdateInfo(kitId, installedPlatformVersions, installedPluginVersions, platformVersionUpdates, pluginVersionUpdates);
        });
    }

    private static printUpdateInfo(indent: number, installedComponentInfo: IDictionary<string>, componentUpdateInfo: IDictionary<string> = null, componentType: ProjectComponentType = ProjectComponentType.Platform): void {
        assert(installedComponentInfo);
        var suffix = componentType === ProjectComponentType.Platform ? resources.getString("CommandKitSelectKitPlatformVersion") : resources.getString("CommandKitSelectKitPluginVersion");
        if (componentUpdateInfo) {
            LoggerHelper.logNameDescriptionTable(
                Object.keys(componentUpdateInfo).map(function (componentName: string): INameDescription {
                    return <INameDescription>{
                        name: componentName,
                        description: installedComponentInfo[componentName] + " => " + componentUpdateInfo[componentName]
                    };
            }), LoggerHelper.DefaultIndent, indent);
        } else { /* This was a CLI update and not a kit update */
            LoggerHelper.logNameDescriptionTable(
                Object.keys(installedComponentInfo).map(function (componentName: string): INameDescription {
                    return <INameDescription>{
                        name: componentName,
                        description: installedComponentInfo[componentName] + " => " + suffix
                    };
            }), LoggerHelper.DefaultIndent, indent);
        }

        logger.logLine();
    }

    /**
     * Returns a map of plugin versions that were installed from NPM (as opposed to local file system or GIT)
     */
    private static getInstalledRegistryPluginVerions(pluginVersions: IDictionary<string>, localOrGitPlugins: string[]): IDictionary<string> {
        if (localOrGitPlugins) {
            var registryPlugins: IDictionary<string> = {};
            Object.keys(pluginVersions).filter(function (pluginName: string): boolean {
                return (localOrGitPlugins.indexOf(pluginName) === -1);
            }).forEach(function (pluginName: string): void {
                registryPlugins[pluginName] = pluginVersions[pluginName];
            });

            return registryPlugins;
        } else {
            return pluginVersions;
        }
    }

    /**
     * Prints the list of plugins that were skipped for auto-update
     */
    private static printListOfComponentsSkippedForUpdate(components: string[]): void {
        if (components && components.length > 0) {
            logger.logLine();
            logger.log(resources.getString("CommandKitSelectNoUpdateListHeader"));
            logger.logLine();
            components.forEach(function (component: string): void {
               logger.logWarning(LoggerHelper.repeat(" ", LoggerHelper.DefaultIndent) + component);
            });
        }
    }

    /**
     * Returns the CLI version that was used to create the project
     */
    private static getCliversion(projectInfo: projectHelper.IProjectInfo): Q.Promise<string> {
        var deferred = Q.defer<string>();
        if (projectInfo.cordovaCliVersion.length === 0) {
            cordovaWrapper.getGlobalCordovaVersion().then(function (globalCordovaVersion: string): void {
                deferred.resolve(globalCordovaVersion);
            });
        } else {
            deferred.resolve(projectInfo.cordovaCliVersion);
        }

        return deferred.promise;
    }

    /**
     * Changes the current kit used for the project at {projectPath} to {kitId}
     */
    private static selectKit(projectPath: string, projectInfo: projectHelper.IProjectInfo, kitId: string): Q.Promise<any> {
        var installedPlatformVersions: IDictionary<string>;
        var installedPluginVersions: IDictionary<string>;
        var platformVersionUpdates: IDictionary<string>;
        var pluginVersionUpdates: IDictionary<string>;
        var kitInfo: TacoKits.IKitInfo;
        var currentCliVersion: string;
        
        return Q.all([projectHelper.getInstalledPlatformVersions(projectPath), projectHelper.getInstalledPluginVersions(projectPath), projectHelper.getLocalOrGitPlugins(projectPath), projectHelper.createTacoJsonFile(projectPath, true, kitId)])
        .spread<any>(function (platformVersions: IDictionary<string>, pluginVersions: IDictionary<string>, localOrGitPlugins: string[], globalCordovaVersion: string): Q.Promise<any> {
            installedPlatformVersions = platformVersions;
            installedPluginVersions = Kit.getInstalledRegistryPluginVerions(pluginVersions, localOrGitPlugins);       
            return Q.all([Kit.getComponentUpdateInfo(projectPath, kitId, installedPlatformVersions, ProjectComponentType.Platform), Kit.getComponentUpdateInfo(projectPath, kitId, installedPluginVersions, ProjectComponentType.Plugin)])
            .spread<any>(function (platformVersionUpdates: IDictionary<string>, pluginVersionUpdates: IDictionary<string>): Q.Promise<any> {
                return Kit.getCliversion(projectInfo)
                .then(function (cliVersion: string): Q.Promise<any> {
                    currentCliVersion = cliVersion;
                    return Kit.printKitProjectUpdateInfo(currentCliVersion, kitId, installedPlatformVersions, installedPluginVersions, platformVersionUpdates, pluginVersionUpdates)
                    .then(function (): Q.Promise<any> {
                        var projectRequiresUpdate: boolean = Kit.projectComponentNeedsUpdate(installedPlatformVersions, platformVersionUpdates) || Kit.projectComponentNeedsUpdate(installedPluginVersions, pluginVersionUpdates);
                        if (projectRequiresUpdate) {
                            Kit.printListOfComponentsSkippedForUpdate(localOrGitPlugins);
                            return Kit.promptAndUpdateProject(projectRequiresUpdate, currentCliVersion, installedPlatformVersions, installedPluginVersions, platformVersionUpdates, pluginVersionUpdates);
                        } else {
                            return Q.resolve({});
                        }
                    });    
                });
            });
        });
    }

    /**
     * Validates whether the version string passed is a valid Cordova version
     */
    private static validateCliVersion(version: string): Q.Promise<any> {
        var deferred = Q.defer<any>();

        if (!semver.valid(version)) {
            return Q.reject(errorHelper.get(TacoErrorCodes.ErrorInvalidVersion, version, "cordova"));
        }

        var npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
        var npmProcess = child_process.spawn(npmCommand, ["view", "cordova", "versions"]);
        npmProcess.on("error", function (error: Error): void {
            throw errorHelper.get(TacoErrorCodes.ErrorReadingPackageVersions, "cordova");
        });
            
        npmProcess.stdout.on("data", function (data: any): void {
            try {
                // The versions are returned as stringified array of strings
                var versions: string = data.toString();
                if (versions.indexOf("'" + version + "'") !== -1) {
                    deferred.resolve(version);
                } else {
                    deferred.reject(errorHelper.get(TacoErrorCodes.ErrorInvalidVersion, version, "cordova"));
                }
            } catch (error) {
                deferred.reject(errorHelper.get(TacoErrorCodes.ErrorReadingPackageVersions, "cordova"));
            }
        });

        return deferred.promise;
    }

    /**
     * Changes the current Cordova CLI used for the project at {projectPath} to {cli}
     */
    private static selectCli(projectPath: string, projectInfo: projectHelper.IProjectInfo, cli: string): Q.Promise<any> {
        return Kit.validateCliVersion(cli)
        .then(function (): Q.Promise<any> {
            return Q.all([projectHelper.getInstalledPlatformVersions(projectPath), projectHelper.getInstalledPluginVersions(projectPath), projectHelper.getLocalOrGitPlugins(projectPath), projectHelper.createTacoJsonFile(projectPath, false, cli)])
            .spread<any>(function (platformVersions: IDictionary<string>, pluginVersions: IDictionary<string>, localOrGitPlugins: string[]): Q.Promise<any> {
                var pluginsToUpdate = Kit.getInstalledRegistryPluginVerions(pluginVersions, localOrGitPlugins);
                return Kit.getCliversion(projectInfo)
                .then(function (currentCliVersion: string): Q.Promise<any> {
                    Kit.printCliProjectUpdateInfo(currentCliVersion, cli, platformVersions, pluginsToUpdate);
                    
                    var projectRequiresUpdate: boolean = ((platformVersions && Object.keys(platformVersions).length > 0) || (pluginVersions && Object.keys(pluginVersions).length > 0)) ? true : false;
                    if (projectRequiresUpdate) {
                        Kit.printListOfComponentsSkippedForUpdate(localOrGitPlugins);
                        return Kit.promptAndUpdateProject(projectRequiresUpdate, currentCliVersion, platformVersions, pluginsToUpdate);
                    } else {
                        return Q.resolve({});
                    }
                });
            });
        });
    }

    private static select(commandData: commands.ICommandData): Q.Promise<tacoUtility.ICommandTelemetryProperties> {
        var kitId: string = commandData.options["kit"];
        var cli: string = commandData.options["cli"];
        var projectInfo: projectHelper.IProjectInfo;
        var projectPath: string = projectHelper.getProjectRoot();

        logger.logLine();

        return projectHelper.getProjectInfo().then(function (info: projectHelper.IProjectInfo): void {
            projectInfo = info;
            if (info.configXmlPath === "") {
                throw errorHelper.get(TacoErrorCodes.NotInCordovaProject);
            }
        })
            .then(function (): Q.Promise<any> {
            var usedkitId: string = projectInfo.tacoKitId;
            if (kitId) {
                if (usedkitId && usedkitId === kitId ) {
                    throw errorHelper.get(TacoErrorCodes.CommandKitProjectUsesSameKit, kitId);
                } else {
                    return Kit.selectKit(projectPath, projectInfo, kitId);
                }
            } else if (cli) {
                var usedCli: string = projectInfo.cordovaCliVersion;
                if (!usedkitId && usedCli && usedCli === cli ) {
                    throw errorHelper.get(TacoErrorCodes.CommandKitProjectUsesSameCli, cli);
                } else {
                    return Kit.selectCli(projectPath, projectInfo, cli);
                }
            } else {
                throw errorHelper.get(TacoErrorCodes.CommandKitCliOrKitShouldBeSpecified);
            }
        }).then(function (): void {
            logger.log(resources.getString("CommandKitSelectStatusSuccess"));
        }).then(() => Kit.generateTelemetryProperties(commandData));
    }

    private static list(commandData: commands.ICommandData): Q.Promise<tacoUtility.ICommandTelemetryProperties> {
        logger.logLine();
        var kitId: string = commandData.options["kit"];
        var jsonPath: any = commandData.options["json"];

        var result: Q.Promise<any>;
        if (typeof jsonPath !== "undefined") {
            result = Kit.writeMetadataJsonFile(commandData);
        } else {
            // If the user requested for info regarding a particular kit, print all the information regarding the kit  
            // Else print minimal information about all the kits
            result = (kitId ? Kit.printKit(kitId) : Kit.printAllKits());
        }

        return result.then(() => Kit.generateTelemetryProperties(commandData));
    }
}

export = Kit;