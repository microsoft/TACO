/// <reference path="../../typings/taco-utils.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />

import tacoUtility = require ("taco-utils");
import utils = tacoUtility.UtilHelper;
import commands = tacoUtility.Commands;
import resources = tacoUtility.ResourcesManager;
import logger = tacoUtility.Logger;
import level = logger.Level;
import createManager = require ("./utils/template-manager");
import cordovaWrapper = require ("./utils/cordova-wrapper");
import nopt = require ("nopt");
import Q = require ("q");

/* 
 * Wrapper interface for create command parameters
 */
interface ICreateParameters {
    projectPath: string;
    appId: string;
    appName: string;
    cordovaConfig: string;
    data: commands.ICommandData;
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
            .then(function (templateDisplayName: string): Q.Promise<any> {
                self.finalize(templateDisplayName);
                return Q.resolve(null);
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

            throw new Error("command.create.notBothTemplateAndCli");
        }
    }

    private createProject(): Q.Promise<string> {
        var mustUseTemplate: boolean = this.mustCreateKitProject() && !this.commandParameters.data.options["copy-from"] && !this.commandParameters.data.options["link-to"];

        // Shortcuts
        var kitId: string = this.commandParameters.data.options["kit"];
        var templateId: string = this.commandParameters.data.options["template"];
        var projectPath: string = this.commandParameters.projectPath;
        var appId: string = this.commandParameters.appId;
        var appName: string = this.commandParameters.appName;
        var cordovaConfig: string = this.commandParameters.cordovaConfig;
        var options: { [option: string]: any } = this.commandParameters.data.options;

        if (mustUseTemplate) {
            var self = this;

            return createManager.createKitProjectWithTemplate(kitId, templateId, projectPath, appId, appName, cordovaConfig, options, Create.TacoOnlyOptions)
                .then(function (templateDisplayName: string): Q.Promise<string> {
                    return Q.resolve(templateDisplayName);
                });
        } else {
            return cordovaWrapper.create(projectPath, appId, appName, cordovaConfig, utils.cleanseOptions(options, Create.TacoOnlyOptions))
                .then(function (): Q.Promise<string> {
                    // We didn't use a template to create the project, so we resolve with a null template display name
                    return Q.resolve<string>(null);
                });
        }
    }

    private finalize(templateDisplayName: string): void {
        // Report success over multiple loggings for different styles
        logger.log(resources.getString("command.create.success.base"), logger.Level.Success);

        if (this.mustCreateKitProject()) {
            if (templateDisplayName) {
                logger.log(" " + resources.getString("command.create.success.projectTemplate", templateDisplayName), logger.Level.Normal);
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