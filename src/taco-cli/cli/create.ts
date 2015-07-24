/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

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

import cordovaHelper = require ("./utils/cordovaHelper");
import cordovaWrapper = require ("./utils/cordovaWrapper");
import kitHelper = require ("./utils/kitHelper");
import projectHelper = require ("./utils/projectHelper");
import resources = require ("../resources/resourceManager");
import TacoErrorCodes = require ("./tacoErrorCodes");
import errorHelper = require ("./tacoErrorHelper");
import tacoUtility = require ("taco-utils");
import templateManager = require ("./utils/templateManager");

import commands = tacoUtility.Commands;
import logger = tacoUtility.Logger;
import LoggerHelper = tacoUtility.LoggerHelper;
import utils = tacoUtility.UtilHelper;

/* 
 * Wrapper interface for create command parameters
 */
interface ICreateParameters {
    cordovaParameters: Cordova.ICordovaCreateParameters;
    data: commands.ICommandData;
}

/*
 * Create
 *
 * Handles "taco create"
 */
class Create implements commands.IDocumentedCommand {
    private static KnownOptions: Nopt.FlagTypeMap = {
        kit: String,
        template: String,
        cli: String,
        "copy-from": String,
        "link-to": String
    };
    private static ShortHands: Nopt.ShortFlags = {
        src: "--copy-from"
    };
    private static DefaultAppId: string = "io.cordova.hellocordova";
    private static DefaultAppName: string = "HelloTaco";

    private commandParameters: ICreateParameters;
    
    public info: commands.ICommandInfo;

    public run(data: commands.ICommandData): Q.Promise<any> {
        try {
            this.parseArguments(data);
            this.verifyArguments();
        } catch (err) {
            return Q.reject(err);
        }

        var self = this;
        var templateDisplayName: string;

        return this.createProject()
            .then(function (templateUsed: string): Q.Promise<any> {
                templateDisplayName = templateUsed;

                var kitProject = self.isKitProject();
                var valueToSerialize: string = kitProject ? self.commandParameters.data.options["kit"] : self.commandParameters.data.options["cli"];

                return projectHelper.createTacoJsonFile(self.commandParameters.cordovaParameters.projectPath, kitProject, valueToSerialize);
            })
            .then(function (): Q.Promise<any> {
                self.finalize(templateDisplayName);

                return Q.resolve({});
            });
    }

    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
        return true;
    }

    private isKitProject(): boolean {
        return !this.commandParameters.data.options["cli"];
    }

    private parseArguments(args: commands.ICommandData): void {
        var commandData: commands.ICommandData = tacoUtility.ArgsHelper.parseArguments(Create.KnownOptions, Create.ShortHands, args.original, 0);
        var cordovaParams: Cordova.ICordovaCreateParameters = {
            projectPath: commandData.remain[0],
            appId: commandData.remain[1] ? commandData.remain[1] : Create.DefaultAppId,
            appName: commandData.remain[2] ? commandData.remain[2] : Create.DefaultAppName,
            cordovaConfig: commandData.remain[3],
            copyFrom: commandData.options["copy-from"],
            linkTo: commandData.options["link-to"]
        };

        this.commandParameters = {
            cordovaParameters: cordovaParams,
            data: commandData
        };
    }

    /**
     * Verify that the right combination of options is passed
     */
    private verifyArguments(): void {
        // Parameter exclusivity validation
        if (this.commandParameters.data.options["template"] && (this.commandParameters.data.options["copy-from"] || this.commandParameters.data.options["link-to"])) {
            throw errorHelper.get(TacoErrorCodes.CommandCreateNotTemplateIfCustomWww);
        }

        if (this.commandParameters.data.options["cli"] && this.commandParameters.data.options["kit"]) {
            throw errorHelper.get(TacoErrorCodes.CommandCreateNotBothCliAndKit);
        }

        if (this.commandParameters.data.options["cli"] && this.commandParameters.data.options["template"]) {
            throw errorHelper.get(TacoErrorCodes.CommandCreateNotBothTemplateAndCli);
        }

        // Make sure a path was specified
        var createPath: string = this.commandParameters.cordovaParameters.projectPath;

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
        var self = this;
        var cordovaCli: string = this.commandParameters.data.options["cli"];
        var mustUseTemplate: boolean = this.isKitProject() && !this.commandParameters.cordovaParameters.copyFrom && !this.commandParameters.cordovaParameters.linkTo;
        var kitId: string = this.commandParameters.data.options["kit"];
        var templateId: string = this.commandParameters.data.options["template"];

        // Create the project 
        if (!this.isKitProject()) {
            return this.printStatusMessage()
                .then(function (): Q.Promise<any> {
                    // Use the CLI version specified as an argument to create the project "command.create.status.cliProject
                    return cordovaWrapper.create(cordovaCli, self.commandParameters.cordovaParameters);
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

                    return templates.createKitProjectWithTemplate(kitId, templateId, cordovaCli, self.commandParameters.cordovaParameters)
                        .then(function (templateDisplayName: string): Q.Promise<string> {
                            return Q.resolve(templateDisplayName);
                        });
                } else {
                    return cordovaWrapper.create(cordovaCli, self.commandParameters.cordovaParameters);
                }
            });
        }
    }

    /**
     * Prints the project creation status message
     */
    private printStatusMessage(): Q.Promise<any> {
        var self = this;
        var cordovaParameters = this.commandParameters.cordovaParameters;
        var projectPath: string = cordovaParameters.projectPath ? path.resolve(cordovaParameters.projectPath) : "''";

        if (!this.isKitProject()) {
            self.printNewProjectTable("CommandCreateStatusTableCordovaCLIVersionDescription", this.commandParameters.data.options["cli"]);
            return Q({});
        } else {
            var kitId: string = this.commandParameters.data.options["kit"];
            return Q({})
                .then(function (): Q.Promise<string> {
                    if (!kitId) {
                        return kitHelper.getDefaultKit().then(kitId => resources.getString("CommandCreateStatusDefaultKitUsedAnnotation", kitId));
                    }

                    return Q(kitId);
                })
                .then(function (kitIdUsed: string): void {
                    self.printNewProjectTable("CommandCreateStatusTableKitVersionDescription", kitIdUsed);
                });
        }
    }

    private repeat(text: string, times: number): string {
        // From: http://stackoverflow.com/questions/1877475/repeat-character-n-times
        return new Array(times + 1).join(text);
    }

    private printNewProjectTable(kitOrCordovaStringResource: string, kitOrCordovaVersion: string): void {
        var cordovaParameters = this.commandParameters.cordovaParameters;
        var projectFullPath: string = path.resolve(this.commandParameters.cordovaParameters.projectPath);

        var indentation = 6; // We leave some empty space on the left before the text/table starts
        resources.log("CommandCreateStatusCreatingNewProject");

        var indentationString = this.repeat(" ", indentation);
        var sectionsSeparator = indentationString + resources.getString("CommandCreateStatusTableSectionSeparator");
        logger.log(sectionsSeparator);
        var rows = [
            { name: resources.getString("CommandCreateStatusTableNameDescription"), description: cordovaParameters.appName },
            { name: resources.getString("CommandCreateStatusTableIDDescription"), description: cordovaParameters.appId },
            { name: resources.getString("CommandCreateStatusTableLocationDescription"), description: projectFullPath },
            { name: resources.getString(kitOrCordovaStringResource), description: kitOrCordovaVersion },
            { name: resources.getString("CommandCreateStatusTableReleaseNotesDescription"), description: resources.getString("CommandCreateStatusTableReleaseNotesLink") },
        ];
        LoggerHelper.logNameDescriptionTable(rows, indentation);
        logger.log(sectionsSeparator);
    }

    /**
     * Finalizes the creation of project by printing the Success messages with information about the Kit and template used
     */
    private finalize(templateDisplayName: string): void {
        // Report success over multiple loggings for different styles
        var projectFullPath: string = path.resolve(this.commandParameters.cordovaParameters.projectPath);
        if (this.isKitProject()) {
            if (templateDisplayName) {
                resources.log("CommandCreateSuccessProjectTemplate", templateDisplayName, projectFullPath);

                if (this.commandParameters.data.options["template"] === "typescript") {
                    resources.log("CommandCreateInstallGulp");
                }
            } else {
                // If both --copy-from and --link-to are specified, Cordova uses --copy-from and ignores --link-to, so for our message we should use the path provided to --copy-from if the user specified both
                var customWwwPath: string = this.commandParameters.data.options["copy-from"] || this.commandParameters.data.options["link-to"];
                resources.log("CommandCreateSuccessProjectCustomWww", customWwwPath, projectFullPath);
            }
        } else {
            resources.log("CommandCreateSuccessProjectCLI", projectFullPath);
        }

        // Print the onboarding experience
        ["OnboardingExperienceSectionSeparator",
            "HowToUseChangeToProjectFolder",
            "HowToUseCommandPlatformAddPlatform",
            "HowToUseCommandInstallReqsPlugin",
            "HowToUseCommandAddPlugin",
            "HowToUseCommandSetupRemote",
            "HowToUseCommandBuildPlatform",
            "HowToUseCommandEmulatePlatform",
            "HowToUseCommandRunPlatform"].forEach(msg => resources.log(msg, projectFullPath));

        logger.logLine();

        ["HowToUseCommandHelp",
        "HowToUseCommandDocs"].forEach(msg => resources.log(msg, projectFullPath));
    }
}

export = Create;
