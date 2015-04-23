/// <reference path="../../typings/tacoUtils.d.ts" />
/// <reference path="../../typings/tacoKits.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />
"use strict";


import fs = require("fs");
import nopt = require ("nopt");
import path = require ("path");
import Q = require("q");
import cordovaWrapper = require ("./utils/cordovaWrapper");
import projectHelper = require ("./utils/project-helper");
import templateManager = require ("./utils/templateManager");
import tacoUtility = require ("taco-utils");
import tacoKits = require ("taco-kits");
import commands = tacoUtility.Commands;
import kitHelper = tacoKits.KitHelper;
import logger = tacoUtility.Logger;
import level = logger.Level;
import utils = tacoUtility.UtilHelper;
import resources = tacoUtility.ResourcesManager;


/* 
 * Wrapper interfaces for config JSON parameter for create command
 */
interface ICordovaLibMetadata {
    url: string;
    version: string;
    id: string;
    link: boolean;
}

interface ICordovaConfigMetadata {
    id: string;
    name: string;
    lib: {
        "www": ICordovaLibMetadata;
    };
}

/* 
 * Wrapper interface for create command parameters
 */
interface ICreateParameters {
    projectPath: string;
    appId: string;
    appName: string;
    cordovaConfig: string;
    data: commands.ICommandData;
    templateDisplayName?: string;
    cordovaCli?: string;
    isKitProject?: boolean;
    kitId?: string;
}

/*
 * Create
 *
 * handles "Taco Create"
 */
class Create implements commands.IDocumentedCommand {
    private static DefaultAppName: string = "HelloTaco";
    private static KnownOptions: Nopt.FlagTypeMap = {
        kit: String,
        template: String,
        cli: String,
        "copy-from": String,
        "link-to": String
    };

    private static TacoOnlyOptions: string[] = ["cli", "kit", "template"];
    private static DefaultAppId: string = "io.taco.myapp";

    private commandParameters: ICreateParameters;
    
    public info: commands.ICommandInfo;

    public run(data: commands.ICommandData): Q.Promise<any> {
        try {
            this.parseArguments(data);
            this.verifyArguments();
        } catch (err) {
            return Q.reject(err.message);
        }

        var self = this;

        return this.createProject()
            .then(function (templateDisplayName: string): Q.Promise<any> {
            var valueToSerialize: string = self.commandParameters.isKitProject ? self.commandParameters.kitId : self.commandParameters.cordovaCli;
            return projectHelper.createTacoJsonFile(self.commandParameters.projectPath, self.commandParameters.isKitProject, valueToSerialize);
        }).then(function (): Q.Promise<any> {
            self.finalize();
            return Q.resolve({});
        });
    }

    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
        return true;
    }

    private parseArguments(args: commands.ICommandData): void {
        var commandData: commands.ICommandData = utils.parseArguments(Create.KnownOptions, {}, args.original, 0);
        this.commandParameters = {
            projectPath: commandData.remain[0],
            appId: commandData.remain[1] ? commandData.remain[1] : Create.DefaultAppId,
            appName: commandData.remain[2] ? commandData.remain[2] : Create.DefaultAppName,
            cordovaConfig: commandData.remain[3],
            data: commandData
        };
    }

    /**
     * Verify that the right combination of options is passed
     */
    private verifyArguments(): void {
        // Parameter exclusivity validation and other verifications
        if (this.commandParameters.data.options["template"] && (this.commandParameters.data.options["copy-from"] || this.commandParameters.data.options["link-to"])) {
            logger.logErrorLine(resources.getString("command.create.notTemplateIfCustomWww"));

            throw new Error("command.create.notTemplateIfCustomWww");
        }

        if (this.commandParameters.data.options["cli"] && this.commandParameters.data.options["kit"]) {
            logger.logErrorLine(resources.getString("command.create.notBothCliAndKit"));

            throw new Error("command.create.notBothCliAndKit");
        }

        if (this.commandParameters.data.options["cli"] && this.commandParameters.data.options["template"]) {
            logger.logErrorLine(resources.getString("command.create.notBothTemplateAndCli"));

            throw new Error("command.create.notBothTemplateAndCli");
        }
    }

    /**
     * Massage the optional parameters - they need to be passed in as a stringified config JSON object to cordova.raw.create 
     */
    private formalizeParameters(): void {
        var config: ICordovaConfigMetadata;
        // If we got a fourth parameter, consider it to be JSON to init the config.
        if (this.commandParameters.cordovaConfig) {
            config = JSON.parse(this.commandParameters.cordovaConfig);
        }

        var customWww = this.commandParameters.data.options["copy-from"] || this.commandParameters.data.options["link-to"];
        if (customWww) {
            if (customWww.indexOf("http") === 0) {
                throw new Error(
                    "Only local paths for custom www assets are supported."
                    );
            }

            // Resolve HOME env path
            if (customWww.substr(0, 1) === "~") {
                customWww = path.join(process.env.HOME, customWww.substr(1));
            }

            customWww = path.resolve(customWww);
            var wwwCfg: ICordovaLibMetadata = { url: customWww, version: "", id: "", link: false };
            if (this.commandParameters.data.options["link-to"]) {
                wwwCfg.link = true;
            }

            if (config) {
                config.lib = config.lib || { www: { url: "", version: "", id: "", link: false } };
                config.lib.www = wwwCfg;
                this.commandParameters.cordovaConfig = JSON.stringify(config);
            } 
        }
    }

    /**
     * Creates the Kit or CLI project
     */
    private createProject(): Q.Promise<any> {
        var self = this;
        this.commandParameters.isKitProject = !this.commandParameters.data.options["cli"];
        this.commandParameters.cordovaCli = this.commandParameters.data.options["cli"];
        var mustUseTemplate: boolean = this.commandParameters.isKitProject && !this.commandParameters.data.options["copy-from"] && !this.commandParameters.data.options["link-to"];
        var kitId: string = this.commandParameters.data.options["kit"];

        this.commandParameters.kitId = kitId;

        var templateId: string = this.commandParameters.data.options["template"];
        var projectPath: string = this.commandParameters.projectPath;
        var appId: string = this.commandParameters.appId;
        var appName: string = this.commandParameters.appName;
        var cordovaConfig: string = this.commandParameters.cordovaConfig;
        var options: { [option: string]: any } = this.commandParameters.data.options;
        var cordovaCli: string;
        
        // Massage the cordovaConfig parameter with the options provided
        this.formalizeParameters();

        logger.log("\n", logger.Level.Normal);

        // Now, create the project 
        if (!this.commandParameters.isKitProject) {
            return this.printStatusMessage()
                .then(function (): Q.Promise<any> {
                    // Use the CLI version specified as an argument to create the project "command.create.status.cliProject
                    return cordovaWrapper.create(self.commandParameters.cordovaCli, projectPath, appId, appName, cordovaConfig, utils.cleanseOptions(options, Create.TacoOnlyOptions));
                });
        } else {
            return kitHelper.getValidCordovaCli(kitId).then(function (cordovaCliToUse: string): void {
                cordovaCli = cordovaCliToUse;
            }).then(function (): Q.Promise<any> {
                return self.printStatusMessage();
            }).then(function (): Q.Promise<any> {
                if (kitId) {
                    return kitHelper.getKitInfo(kitId);
                } else {
                    return Q.resolve(null);
                }      
            }).then(function (kitInfo: TacoKits.IKitInfo): Q.Promise<any> {
                    if (kitInfo && kitHelper.isKitDeprecated(kitInfo)) {
                        // Warn the user
                        logger.log("\n");
                        logger.logLine(resources.getString("command.create.warning.deprecatedKit", kitId), logger.Level.Warn);
                        logger.log("\n");
                        logger.logLine(resources.getString("command.create.warning.deprecatedKitSuggestion"), logger.Level.Warn);
                    }

                    if (mustUseTemplate) {
                        return templateManager.createKitProjectWithTemplate(kitId, templateId, cordovaCli, projectPath, appId, appName, cordovaConfig, options, Create.TacoOnlyOptions)
                            .then(function (templateDisplayName: string): Q.Promise<string> {
                                self.commandParameters.templateDisplayName = templateDisplayName;
                                return Q.resolve(templateDisplayName);
                            });
                    } else {
                        return cordovaWrapper.create(cordovaCli, projectPath, appId, appName, cordovaConfig, utils.cleanseOptions(options, Create.TacoOnlyOptions));
                    }
            });
        }
    }

    /**
     * Prints the project creation status message
     */
    private printStatusMessage(): Q.Promise<any> {
        var deferred: Q.Deferred<any> = Q.defer<any>();
        logger.log(resources.getString("command.create.status.projectName"), logger.Level.Normal);
        logger.log(this.commandParameters.appName, logger.Level.NormalBold);
        logger.log(resources.getString("command.create.status.projectId"), logger.Level.Normal);
        logger.log(this.commandParameters.appId, logger.Level.NormalBold);
        logger.log(resources.getString("command.create.status.projectPath"), logger.Level.Normal);
        logger.log(this.commandParameters.projectPath, logger.Level.NormalBold);
            
        if (!this.commandParameters.isKitProject) {
            logger.log(resources.getString("command.create.status.cordovaCliUsed"), logger.Level.Normal);
            logger.log(this.commandParameters.cordovaCli, logger.Level.NormalBold);
            logger.log(resources.getString("command.create.status.noKitUsed"), logger.Level.Normal);
            logger.logLine("...", logger.Level.Normal);
            logger.log("\n");
        } else {
            var self = this;
            return kitHelper.getDefaultKit().then(function (defaultKitId: string): void {
                if (!self.commandParameters.kitId) {
                    self.commandParameters.kitId = defaultKitId;
                }

                logger.log(resources.getString("command.create.status.kitIdUsed"), logger.Level.Normal);
                logger.log(self.commandParameters.kitId, logger.Level.NormalBold);
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
    private finalize(): void {
        // Report success over multiple loggings for different styles
        logger.log("\n", logger.Level.Normal);
        logger.log(resources.getString("command.create.success.base"), logger.Level.Success);

        if (this.mustCreateKitProject()) {
            if (this.commandParameters.templateDisplayName) {
                logger.log(" " + resources.getString("command.create.success.projectTemplate", this.commandParameters.templateDisplayName, this.commandParameters.kitId), logger.Level.Normal);
            } else {
                // If both --copy-from and --link-to are specified, Cordova uses --copy-from and ignores --link-to, so for our message we should use the path provided to --copy-from if the user specified both
                var customWwwPath: string = this.commandParameters.data.options["copy-from"] ? this.commandParameters.data.options["copy-from"] : this.commandParameters.data.options["link-to"];

                logger.log(" " + resources.getString("command.create.success.projectCustomWww", customWwwPath), logger.Level.Normal);
            }
        } else {
            logger.log(" " + resources.getString("command.create.success.projectCLI", customWwwPath), logger.Level.Normal);
        }

        logger.logLine(" " + resources.getString("command.create.success.path", this.commandParameters.projectPath), logger.Level.NormalBold);
    }

    private mustCreateKitProject(): boolean {
        return !this.commandParameters.data.options["cli"];
    }
}

export = Create;