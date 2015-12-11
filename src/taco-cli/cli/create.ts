/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />
/// <reference path="../../typings/tacoKits.d.ts" />
/// <reference path="../../typings/tacoUtils.d.ts" />
/// <reference path="../../typings/tacoUtils.d.ts" />

"use strict";

import fs = require ("fs");
import nopt = require ("nopt");
import path = require ("path");
import Q = require ("q");
import util = require ("util");

import kit = require ("./kit");
import kitHelper = require ("./utils/kitHelper");
import resources = require ("../resources/resourceManager");
import TacoErrorCodes = require ("./tacoErrorCodes");
import errorHelper = require ("./tacoErrorHelper");
import tacoUtility = require ("taco-utils");
import templateManager = require ("./utils/templateManager");
import telemetryHelper = tacoUtility.TelemetryHelper;

import commands = tacoUtility.Commands;
import CordovaWrapper = tacoUtility.CordovaWrapper;
import logger = tacoUtility.Logger;
import ProjectHelper = tacoUtility.ProjectHelper;
import LoggerHelper = tacoUtility.LoggerHelper;
import utils = tacoUtility.UtilHelper;

import ICommandTelemetryProperties = tacoUtility.ICommandTelemetryProperties;

/**
 * Create
 *
 * Handles "taco create"
 */
class Create extends commands.TacoCommandBase {
    private static KNOWN_OPTIONS: Nopt.FlagTypeMap = {
        kit: String,
        template: String,
        cordova: String,
        "copy-from": String,
        "link-to": String
    };
    private static SHORT_HANDS: Nopt.ShortFlags = {
        src: "--copy-from"
    };
    private static DEFAULT_APP_ID: string = "io.taco.hellotaco";
    private static DEFAULT_APP_NAME: string = "HelloTaco";

    public name: string = "create";
    public info: commands.ICommandInfo;

    private  cordovaParameters: Cordova.ICordovaCreateParameters;

    public parseArgs(args: string[]): commands.ICommandData {
        var commandData: commands.ICommandData = tacoUtility.ArgsHelper.parseArguments(Create.KNOWN_OPTIONS, Create.SHORT_HANDS, args, 0);
        this.cordovaParameters = {
            projectPath: commandData.remain[0],
            appId: commandData.remain[1] ? commandData.remain[1] : Create.DEFAULT_APP_ID,
            appName: commandData.remain[2] ? commandData.remain[2] : Create.DEFAULT_APP_NAME,
            cordovaConfig: commandData.remain[3],
            copyFrom: commandData.options["copy-from"],
            linkTo: commandData.options["link-to"]
        };

        this.verifyArguments(commandData);
        return commandData;
    }

    protected runCommand(): Q.Promise<ICommandTelemetryProperties> {

        var self: Create = this;
        var templateDisplayName: string;

        return this.createProject()
            .then(function (templateUsed: string): Q.Promise<any> {
                templateDisplayName = templateUsed;

                var kitProject: boolean = self.isKitProject();
                var valueToSerialize: string = kitProject ? self.data.options["kit"] : self.data.options["cordova"];
                var tacoJsonEditParams: ITacoJsonEditParams = {
                    projectPath: self.cordovaParameters.projectPath,
                    isKitProject: kitProject,
                    version: valueToSerialize
                };

                return kitHelper.editTacoJsonFile(tacoJsonEditParams);
            })
            .then(function (): Q.Promise<any> {
                self.finalize(templateDisplayName);

                return Q.resolve({});
            }).then(function (): Q.Promise<ICommandTelemetryProperties> {
                return self.generateTelemetryProperties();
            });
    }

    /**
     * Generates the telemetry properties for the create operation
     */
    private generateTelemetryProperties(): Q.Promise<ICommandTelemetryProperties> {
        var telemetryProperties: ICommandTelemetryProperties = {};
        telemetryProperties["cliVersion"] = telemetryHelper.telemetryProperty(require("../package.json").version);
        var self: Create = this;
        return kitHelper.getDefaultKit().then(function (defaultKitId: string): Q.Promise<ICommandTelemetryProperties> {
            if (self.isKitProject()) {
                telemetryProperties["kit"] = telemetryHelper.telemetryProperty(self.data.options["kit"] || defaultKitId);
                telemetryProperties["template"] = telemetryHelper.telemetryProperty(self.data.options["template"] || "blank");
            } else {
                telemetryProperties["cordova"] = telemetryHelper.telemetryProperty(self.data.options["cordova"]);
            }

            return Q.resolve(telemetryHelper.addPropertiesFromOptions(telemetryProperties, Create.KNOWN_OPTIONS, self.data.options, ["cordova", "kit", "template"]));
        });
    }

    /**
     * Verify that the right combination of options is passed
     */
    private verifyArguments(data: commands.ICommandData): void {
        // Parameter exclusivity validation
        if (data.options.hasOwnProperty("template") && (data.options.hasOwnProperty("copy-from") || data.options.hasOwnProperty("link-to"))) {
            throw errorHelper.get(TacoErrorCodes.CommandCreateNotTemplateIfCustomWww);
        }

        if (data.options.hasOwnProperty("cordova") && data.options.hasOwnProperty("kit")) {
            throw errorHelper.get(TacoErrorCodes.CommandCreateNotBothCordovaCliAndKit);
        }

        if (data.options.hasOwnProperty("cordova") && data.options.hasOwnProperty("template")) {
            throw errorHelper.get(TacoErrorCodes.CommandCreateNotBothTemplateAndCordovaCli);
        }

        // Make sure a path was specified
        var createPath: string = this.cordovaParameters.projectPath;

        if (!createPath) {
            throw errorHelper.get(TacoErrorCodes.CommandCreateNoPath);
        }

        // Make sure the specified path is valid
        if (!utils.isPathValid(createPath) || !fs.existsSync(path.dirname(createPath))) {
            throw errorHelper.get(TacoErrorCodes.CommandCreateInvalidPath, createPath);
        }

        // Make sure the specified path is empty if it exists
        if (fs.existsSync(createPath) && fs.readdirSync(createPath).length > 0) {
            throw errorHelper.get(TacoErrorCodes.CommandCreatePathNotEmpty, createPath);
        }
    }

    /**
     * Creates the Kit or CLI project
     */
    private createProject(): Q.Promise<string> {
        var self: Create = this;
        var cordovaCli: string = this.data.options["cordova"];
        var mustUseTemplate: boolean = this.isKitProject() && !this.cordovaParameters.copyFrom && !this.cordovaParameters.linkTo;
        var kitId: string = this.data.options["kit"];
        var templateId: string = this.data.options["template"];

        // Create the project 
        if (!this.isKitProject()) {
            return this.printStatusMessage()
                .then(function (): Q.Promise<any> {
                    // Use the CLI version specified as an argument to create the project "command.create.status.cliProject
                    return CordovaWrapper.create(cordovaCli, self.cordovaParameters);
                });
        } else {
            return kitHelper.getValidCordovaCli(kitId).then(function (cordovaCliToUse: string): void {
                cordovaCli = cordovaCliToUse;
            })
                .then(function (): Q.Promise<any> {
                    return self.printStatusMessage();
                })
                .then(function (): Q.Promise<any> {
                    if (kitId) {
                        return kitHelper.getKitInfo(kitId);
                    } else {
                        return Q.resolve(null);
                    }
                })
                .then(function (kitInfo: TacoKits.IKitInfo): Q.Promise<string> {
                    if (kitInfo && !!kitInfo.deprecated) {
                        // Warn the user
                        logger.log(resources.getString("CommandCreateWarningDeprecatedKit", kitId));
                    }

                    if (mustUseTemplate) {
                        var templates: templateManager = new templateManager(kitHelper);

                        return templates.createKitProjectWithTemplate(kitId, templateId, cordovaCli, self.cordovaParameters)
                            .then(function (templateDisplayName: string): Q.Promise<string> {
                                return Q.resolve(templateDisplayName);
                            });
                    } else {
                        return CordovaWrapper.create(cordovaCli, self.cordovaParameters);
                    }
                });
        }
    }

    /**
     * Prints the project creation status message
     */
    private printStatusMessage(): Q.Promise<any> {
        var self: Create = this;
        var cordovaParameters: Cordova.ICordovaCreateParameters = this.cordovaParameters;
        var projectPath: string = cordovaParameters.projectPath ? path.resolve(cordovaParameters.projectPath) : "''";

        if (!this.isKitProject()) {
            self.printNewProjectTable("CommandCreateStatusTableCordovaCLIVersionDescription", this.data.options["cordova"]);
            return Q({});
        } else {
            var kitIdArg: string = this.data.options["kit"];
            return (kitIdArg ? Q(kitIdArg) : kitHelper.getDefaultKit())
                .then((kitId: string) => kitHelper.getKitInfo(kitId)
                    .then((kitInfo: TacoKits.IKitInfo) => self.printNewProjectTable("CommandCreateStatusTableKitVersionDescription",
                        kit.getKitTitle(kitId, kitInfo))));
        }
    }

    private repeat(text: string, times: number): string {
        // From: http://stackoverflow.com/questions/1877475/repeat-character-n-times
        return new Array(times + 1).join(text);
    }

    private printNewProjectTable(kitOrCordovaStringResource: string, kitOrCordovaVersion: string): void {
        var cordovaParameters: Cordova.ICordovaCreateParameters = this.cordovaParameters;
        var projectFullPath: string = path.resolve(this.cordovaParameters.projectPath);

        var indentation: number = 6; // We leave some empty space on the left before the text/table starts
        var nameDescriptionPairs: INameDescription[] = [
            { name: resources.getString("CommandCreateStatusTableNameDescription"), description: cordovaParameters.appName },
            { name: resources.getString("CommandCreateStatusTableIDDescription"), description: cordovaParameters.appId },
            { name: resources.getString("CommandCreateStatusTableLocationDescription"), description: projectFullPath },
            { name: resources.getString(kitOrCordovaStringResource), description: kitOrCordovaVersion },
        ];
        LoggerHelper.logNameDescriptionTableWithHorizontalBorders(nameDescriptionPairs, indentation);
    }

    /**
     * Finalizes the creation of project by printing the Success messages with information about the Kit and template used
     */
    private finalize(templateDisplayName: string): void {
        // Report success over multiple loggings for different styles
        var projectFullPath: string = path.resolve(this.cordovaParameters.projectPath);
        if (this.isKitProject()) {
            if (templateDisplayName) {
                logger.log(resources.getString("CommandCreateSuccessProjectTemplate", templateDisplayName, projectFullPath));

                if (this.data.options["template"] === "typescript") {
                    logger.log(resources.getString("CommandCreateInstallGulp"));
                }
            } else {
                // If both --copy-from and --link-to are specified, Cordova uses --copy-from and ignores --link-to, so for our message we should use the path provided to --copy-from if the user specified both
                var customWwwPath: string = this.data.options["copy-from"] || this.data.options["link-to"];
                logger.log(resources.getString("CommandCreateSuccessProjectCustomWww", customWwwPath, projectFullPath));
            }
        } else {
            logger.log(resources.getString("CommandCreateSuccessProjectCLI", projectFullPath));
        }

        // Print the onboarding experience
        logger.log(resources.getString("OnboardingExperienceTitle"));
        LoggerHelper.logList(["HowToUseChangeToProjectFolder",
            "HowToUseCommandPlatformAddPlatform",
            "HowToUseCommandInstallReqsPlugin",
            "HowToUseCommandAddPlugin",
            "HowToUseCommandSetupRemote",
            "HowToUseCommandBuildPlatform",
            "HowToUseCommandEmulatePlatform",
            "HowToUseCommandRunPlatform"].map((msg: string) => resources.getString(msg, projectFullPath)));

        ["",
            "HowToUseCommandHelp",
            "HowToUseCommandDocs"].forEach((msg: string) => logger.log(resources.getString(msg)));
    }

    private isKitProject(): boolean {
        return !this.data.options["cordova"];
    }
}

export = Create;
