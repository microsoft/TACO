/// <reference path="../../typings/taco-utils.d.ts" />
/// <reference path="../../typings/taco-kits.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />

import tacoUtility = require ("taco-utils");
import tacoKits = require ("taco-kits");
import utils = tacoUtility.UtilHelper;
import kitHelper = tacoKits.KitHelper;
import commands = tacoUtility.Commands;
import resources = tacoUtility.ResourcesManager;
import logger = tacoUtility.Logger;
import level = logger.Level;
import createManager = require ("./utils/template-manager");
import cordovaWrapper = require ("./utils/cordova-wrapper");
import nopt = require ("nopt");
import Q = require("q");
import fs = require("fs");
import path = require("path");

/* 
 * Wrapper interface for create command parameters
 */
interface ICreateParameters {
    projectPath: string;
    appId: string;
    appName: string;
    cordovaConfig: string;
    data: commands.ICommandData;
    cordovaCli?: string;
    templateDisplayName?: string;
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
    private static DefaultAppId: string = "io.taco.myapp";
    private static KnownOptions: Nopt.FlagTypeMap = {
        kit: String,
        template: String,
        cli: String,
        "copy-from": String,
        "link-to": String
    };

    private commandParameters: ICreateParameters;

    public static TacoOnlyOptions: string[] = ["cli", "kit", "template"];
    
    public info: commands.ICommandInfo;

    public run(data: commands.ICommandData): Q.Promise<any> {
        this.parseArguments(data);
        this.verifyArguments();

        var self = this;

        return this.createProject()
            .then(function (): Q.Promise<any> {
            return self.createTacoJsonFile()
                .then(function (): Q.Promise<any> {
                self.finalize();
                return Q.resolve(null);
            });
        }).fail(function (err: any) {
            logger.log(err.message, logger.Level.Error);
            return Q.reject({});
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

            throw new Error("command.create.notBothCliAndKit");
        }
    }

    private createProject(): Q.Promise<any> {
        var self = this;
        var input: string[] = process.argv;
        this.commandParameters.isKitProject = !this.commandParameters.data.options["cli"];
        var mustUseTemplate: boolean = this.commandParameters.isKitProject && !this.commandParameters.data.options["copy-from"] && !this.commandParameters.data.options["link-to"];
        var kitId: string = this.commandParameters.data.options["kit"];
        var templateId: string = this.commandParameters.data.options["template"];
        var projectPath: string = this.commandParameters.projectPath;
        var appId: string = this.commandParameters.appId;
        var appName: string = this.commandParameters.appName;
        var cordovaConfig: string = this.commandParameters.cordovaConfig;
        var options: { [option: string]: any } = this.commandParameters.data.options;
        var cordovaCli: string;

        logger.log("\n", logger.Level.Normal);

        if (!this.commandParameters.isKitProject) {
            this.commandParameters.cordovaCli = this.commandParameters.data.options["cli"];
            // Use the CLI version specified as an argument to create the project
            return cordovaWrapper.create(this.commandParameters.cordovaCli, projectPath, appId, appName, cordovaConfig, utils.cleanseOptions(options, Create.TacoOnlyOptions));
        } else {
            return kitHelper.getValidCordovaCli(kitId).then(function (cordovaCli): Q.Promise<any> {
                self.commandParameters.kitId = kitId;
                if (mustUseTemplate) {
                    return createManager.createKitProjectWithTemplate(kitId, templateId, cordovaCli, projectPath, appId, appName, cordovaConfig, options)
                        .then(function (templateDisplayName: string): Q.Promise<any> {
                        self.commandParameters.templateDisplayName = templateDisplayName;
                        return Q.resolve(null);
                    });
                } else {
                    return cordovaWrapper.create(cordovaCli, projectPath, appId, appName, cordovaConfig, utils.cleanseOptions(options, Create.TacoOnlyOptions));
                }
            });
        }
    }

    private createJsonFileWithContents(tacoJsonPath: string, jsonData: any): Q.Promise<any> {
        var deferred: Q.Deferred<any> = Q.defer<any>();
        fs.writeFile(tacoJsonPath, JSON.stringify(jsonData), function (err: NodeJS.ErrnoException): void {
            if (err) {
                deferred.reject(err);
            }
            deferred.resolve({});
        });
        return deferred.promise;
    }

    private createTacoJsonFile(): Q.Promise<any> {
        var deferred: Q.Deferred<any> = Q.defer<any>();
        var jsonData: { [obj: string]: string };
        var tacoJsonPath: string = path.resolve(this.commandParameters.projectPath, "taco.json");
        if (this.commandParameters.isKitProject) {
            if (!this.commandParameters.kitId) {
                return kitHelper.getDefaultKit().then(function (kitId): void {
                    this.commandParameters.kitId = kitId;
                    return this.createJsonFileWithContents(tacoJsonPath, { 'kit': kitId });
                });
            }
            else {
                return this.createJsonFileWithContents(tacoJsonPath, { 'kit': this.commandParameters.kitId });
            }
        } else {
            if (!this.commandParameters.cordovaCli) {
                deferred.reject(resources.getString("command.create.tacoJsonFileCreationError"));
                return deferred.promise;
            }
            return this.createJsonFileWithContents(tacoJsonPath, { 'cli': this.commandParameters.cordovaCli });
        }
    }

    private finalize(): void {
        logger.log("\n", logger.Level.Normal);

        // Report success over multiple loggings for different styles
        logger.log(resources.getString("command.create.success.base"), logger.Level.Success);

        if (this.commandParameters.isKitProject) {
            if (this.commandParameters.templateDisplayName) {
                logger.log(" " + resources.getString("command.create.success.projectTemplate", this.commandParameters.templateDisplayName), logger.Level.Normal);
            } else {
                // If both --copy-from and --link-to are specified, Cordova uses --copy-from and ignores --link-to, so for our message we should use the path provided to --copy-from if the user specified both
                var customWwwPath: string = this.commandParameters.data.options["copy-from"] ? this.commandParameters.data.options["copy-from"] : this.commandParameters.data.options["link-to"];

                logger.log(" " + resources.getString("command.create.success.projectCustomWww", customWwwPath), logger.Level.Normal);
            }

            logger.log(" " + resources.getString("command.create.success.readyForUse"), logger.Level.Normal);
        } else {
            logger.log(" " + resources.getString("command.create.success.projectCLI", customWwwPath), logger.Level.Normal);
        }

        logger.logLine(" " + resources.getString("command.create.success.path", this.commandParameters.projectPath), logger.Level.NormalBold);
        if (this.commandParameters.isKitProject) {
            logger.log(" " + resources.getString("command.create.success.kitUsed", this.commandParameters.kitId), logger.Level.NormalBold);
        }
    }
}

export = Create;