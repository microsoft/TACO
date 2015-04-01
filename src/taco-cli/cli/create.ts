/// <reference path="../../typings/taco-utils.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />

import tacoUtility = require ("taco-utils");
import utils = tacoUtility.UtilHelper;
import commands = tacoUtility.Commands;
import resources = tacoUtility.ResourcesManager;
import logger = tacoUtility.Logger;
import templateHelper = require("./utils/template-helper");
import templates = templateHelper.TemplateHelper;
import cordovaWrapper = require ("./utils/cordova-wrapper");
import level = logger.Level;
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
    private static TacoOnlyOptions: string[] = ["kit", "cli", "template"];
    private static KnownOptions: Nopt.FlagTypeMap = {
        kit: String,
        template: String,
        cli: String,
        "copy-from": String,
        "link-to": String
    };

    private static DefaultAppName: string = "HelloTaco";
    private static DefaultAppId: string = "io.taco.myapp";
    private static DefaultTemplateId: string = "blank";

    private commandParameters: ICreateParameters;
    public info: commands.ICommandInfo;

    public run(data: commands.ICommandData): Q.Promise<any> {
        var self = this;

        this.parseArguments(data);
        this.verifyArguments();

        return this.processTemplate().then(function (): Q.Promise<any> {
            return self.callCordovaCreate();
        }).then(function (): Q.Promise<any> {
            return self.finishTemplateInstallationIfNeeded();
        }).then(function (): Q.Promise<any> {
            self.finalizeCommand();
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
            appId: commandData.remain[1],
            appName: commandData.remain[2],
            cordovaConfig: commandData.remain[3],
            data: commandData
        }
    }

    private verifyArguments(): Q.Promise<any> {
        // Parameter exclusivity validation and other verifications
        if (this.commandParameters.data.options["template"] && (this.commandParameters.data.options["copy-from"] || this.commandParameters.data.options["link-to"])) {
            logger.logErrorLine(resources.getString("command.create.notTemplateIfCustomWww"));
            return Q.reject("command.create.notTemplateIfCustomWww");
        }

        if (this.commandParameters.data.options["cli"] && this.commandParameters.data.options["kit"]) {
            logger.logErrorLine(resources.getString("command.create.notBothCliAndKit"));
            return Q.reject("command.create.notBothCliAndKit");
        }

        if (this.commandParameters.data.options["cli"] && this.commandParameters.data.options["template"]) {
            logger.logWarnLine(resources.getString("command.create.notBothTemplateAndCli"));
        }

        return Q.resolve(null);
    }

    private processTemplate(): Q.Promise<any> {
        // Determine whether we are in a kit project
        var isKitProject: boolean = !this.commandParameters.data.options["cli"];

        // Determine whether we need to use templates
        var mustUseTemplates: boolean = isKitProject && !this.commandParameters.data.options["copy-from"] && !this.commandParameters.data.options["link-to"];

        if (mustUseTemplates) {
            // Save the this reference to keep access to commandData in nested promises
            var self = this;

            // Get the specified template's path in the cache
            if (!this.commandParameters.data.options.hasOwnProperty("template") || !this.commandParameters.data.options["template"]) {
                this.commandParameters.data.options["template"] = Create.DefaultTemplateId;
            }

            return templates.getCachedTemplatePath(this.commandParameters.data.options["template"]).then(
                function (cachedTemplatePath: string): Q.Promise<any> {
                    // The specified template is in the cache and we have its path; set the --copy-from flag to that path
                    self.commandParameters.data.options["copy-from"] = cachedTemplatePath;
                    return Q.resolve(null);
                },
                function (errorId: string): Q.Promise<any> {
                    if (errorId === "command.create.templateNotFound") {
                        logger.logErrorLine(resources.getString("command.create.templateNotFound", self.commandParameters.data.options["template"]));
                    } else {
                        logger.logErrorLine(resources.getString(errorId));
                    }

                    return Q.reject(errorId);
                });
        }

        // If we reach this, then we didn't need to install a template
        return Q.resolve(null);
    }

    private callCordovaCreate(): Q.Promise<any> {
        // Create the flag bag to pass to Cordova, stripping out any flag that is specific to taco-cli
        var opts: { [flag: string]: any } = {};

        for (var option in this.commandParameters.data.options) {
            if (Create.TacoOnlyOptions.indexOf(option) === -1) {
                // This is not an option we understand; pass it through to Cordova
                opts[option] = this.commandParameters.data.options[option];
            }
        }

        return cordovaWrapper.create(this.commandParameters.projectPath, this.commandParameters.appId, this.commandParameters.appName, this.commandParameters.cordovaConfig, opts);
    }

    private finishTemplateInstallationIfNeeded(): Q.Promise<any> {
        // Finish template installation if needed
        if (this.commandParameters.data.options["template"]) {
            var appId: string = this.commandParameters.appId ? this.commandParameters.appId : Create.DefaultAppId;
            var appName: string = this.commandParameters.appName ? this.commandParameters.appName : Create.DefaultAppName;

            var tokens: { [token: string]: string } = {
                "\\$appid\\$": appId,
                "\\$projectname\\$": appName
            };

            return templates.finalizeTemplateInstallation(this.commandParameters.projectPath, this.commandParameters.data.options["copy-from"], tokens);
        }

        return Q.resolve(null);
    }

    private finalizeCommand(): void {
        // Report success over multiple logging for different styles
        logger.log(resources.getString("command.create.success.base"), logger.Level.Success);
        logger.log(" " + resources.getString("command.create.success.readyForUse"), logger.Level.Normal);
        logger.logLine(" " + resources.getString("command.create.success.path", this.commandParameters.projectPath), logger.Level.NormalBold);
    }
}

export = Create;