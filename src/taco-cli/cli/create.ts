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
/// <reference path="../../typings/nopt.d.ts" />

"use strict";

import fs = require ("fs");
import nopt = require ("nopt");
import path = require ("path");
import Q = require ("q");

import cordovaHelper = require ("./utils/cordovaHelper");
import cordovaWrapper = require ("./utils/cordovaWrapper");
import projectHelper = require ("./utils/project-helper");
import resources = require ("../resources/resourceManager");
import tacoKits = require ("taco-kits");
import TacoErrorCodes = require ("./tacoErrorCodes");
import errorHelper = require ("./tacoErrorHelper");
import tacoUtility = require ("taco-utils");
import templateManager = require ("./utils/templateManager");

import commands = tacoUtility.Commands;
import kitHelper = tacoKits.KitHelper;
import logger = tacoUtility.Logger;
import level = logger.Level;
import utils = tacoUtility.UtilHelper;

/* 
 * Wrapper interface for create command parameters
 */
interface ICreateParameters {
    cordovaParameters: cordovaHelper.ICordovaCreateParameters;
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
        list: Boolean,
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

        if (this.commandParameters.data.options["list"]) {
            return this.listTemplates();
        } else {
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
        var commandData: commands.ICommandData = utils.parseArguments(Create.KnownOptions, {}, args.original, 0);
        var cordovaParams: cordovaHelper.ICordovaCreateParameters = {
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
        // Parameter exclusivity validation and other verifications
        if (this.commandParameters.data.options["template"] && (this.commandParameters.data.options["copy-from"] || this.commandParameters.data.options["link-to"])) {
            throw errorHelper.get(TacoErrorCodes.CommandCreateNotTemplateIfCustomWww);
        }

        if (this.commandParameters.data.options["cli"] && this.commandParameters.data.options["kit"]) {
            throw errorHelper.get(TacoErrorCodes.CommandCreateNotBothCliAndKit);
        }

        if (this.commandParameters.data.options["cli"] && this.commandParameters.data.options["template"]) {
            throw errorHelper.get(TacoErrorCodes.CommandCreateNotBothTemplateAndCli);
        }
    }

    /**
     * List available templates for the specified kit, or for the default kit if no kit is specified
     */
    private listTemplates(): Q.Promise<any> {
        var kit = this.commandParameters.data.options["kit"];
        var templates: templateManager = new templateManager(kitHelper);

        return templates.getTemplatesForKit(kit)
            .then(function (list: templateManager.ITemplateList): void {
            var kitToPrint: string = kit || list.kitId;

            logger.logLine(resources.getString("CommandCreateListBase", kitToPrint));
            logger.log("\n");

            for (var i: number = 0; i < list.templates.length; i++) {
                logger.log(list.templates[i].id, level.NormalBold);
                logger.log(": " + list.templates[i].name);
                logger.log("\n");
            }
        });
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

        logger.log("\n", logger.Level.Normal);

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
                if (kitInfo && kitHelper.isKitDeprecated(kitInfo)) {
                    // Warn the user
                    logger.log("\n");
                    logger.logLine(resources.getString("CommandCreateWarningDeprecatedKit", kitId), logger.Level.Warn);
                    logger.log("\n");
                    logger.logLine(resources.getString("CommandCreateWarningDeprecatedKitSuggestion"), logger.Level.Warn);
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
        var deferred: Q.Deferred<any> = Q.defer<any>();

        logger.log(resources.getString("CommandCreateStatusProjectName"), logger.Level.Normal);
        logger.log(this.commandParameters.cordovaParameters.appName, logger.Level.NormalBold);
        logger.log(resources.getString("CommandCreateStatusProjectId"), logger.Level.Normal);
        logger.log(this.commandParameters.cordovaParameters.appId, logger.Level.NormalBold);

        if (this.commandParameters.cordovaParameters.projectPath) {
            logger.log(resources.getString("CommandCreateStatusProjectPath"), logger.Level.Normal);
            logger.log(this.commandParameters.cordovaParameters.projectPath, logger.Level.NormalBold);
        }
        
        if (!this.isKitProject()) {
            logger.log(resources.getString("CommandCreateStatusCordovaCliUsed"), logger.Level.Normal);
            logger.log(this.commandParameters.data.options["cli"], logger.Level.NormalBold);
            logger.log(resources.getString("CommandCreateStatusNoKitUsed"), logger.Level.Normal);
            logger.logLine("...", logger.Level.Normal);
            logger.log("\n");
        } else {
            var self = this;

            return kitHelper.getDefaultKit()
                .then(function (defaultKitId: string): void {
                    var kitId: string = self.commandParameters.data.options["kit"];

                    if (!kitId) {
                        kitId = defaultKitId;
                    }

                    logger.log(resources.getString("CommandCreateStatusKitIdUsed"), logger.Level.Normal);
                    logger.log(kitId, logger.Level.NormalBold);
                    logger.logLine("...", logger.Level.Normal);
                    logger.log("\n");
                });
        }

        deferred.resolve({});

        return deferred.promise;
    }

    /**
     * Finalizes the creation of project by printing the Success messages with information about the Kit and template used
     */
    private finalize(templateDisplayName: string): void {
        // Report success over multiple loggings for different styles
        logger.log("\n", logger.Level.Normal);
        logger.log(resources.getString("CommandSuccessBase"), logger.Level.Success);

        if (this.isKitProject()) {
            if (templateDisplayName) {
                logger.log(" " + resources.getString("CommandCreateSuccessProjectTemplate", templateDisplayName), logger.Level.Normal);
            } else {
                // If both --copy-from and --link-to are specified, Cordova uses --copy-from and ignores --link-to, so for our message we should use the path provided to --copy-from if the user specified both
                var customWwwPath: string = this.commandParameters.data.options["copy-from"] ? this.commandParameters.data.options["copy-from"] : this.commandParameters.data.options["link-to"];

                logger.log(" " + resources.getString("CommandCreateSuccessProjectCustomWww", customWwwPath), logger.Level.Normal);
            }
        } else {
            logger.log(" " + resources.getString("CommandCreateSuccessProjectCLI", customWwwPath), logger.Level.Normal);
        }

        logger.logLine(" " + resources.getString("CommandCreateSuccessPath", this.commandParameters.cordovaParameters.projectPath), logger.Level.NormalBold);
    }
}

export = Create;
