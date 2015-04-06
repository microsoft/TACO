/// <reference path="../../typings/taco-utils.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />

import tacoUtility = require ("taco-utils");
import utils = tacoUtility.UtilHelper;
import commands = tacoUtility.Commands;
import resources = tacoUtility.ResourcesManager;
import logger = tacoUtility.Logger;
import level = logger.Level;
import createManager = require ("./utils/create-manager");
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
    templateDisplayName?: string;
}

/*
 * Create
 *
 * handles "Taco Create"
 */
class Create implements commands.IDocumentedCommand {
    private static KnownOptions: Nopt.FlagTypeMap = {
        kit: String,
        template: String,
        cli: String,
        "copy-from": String,
        "link-to": String
    };

    private commandParameters: ICreateParameters;
    public info: commands.ICommandInfo;

    public run(data: commands.ICommandData): Q.Promise<any> {
        var self = this;

        this.parseArguments(data);
        this.verifyArguments();

        return this.createProject()
            .then(function (templateDisplayName: string): Q.Promise<any> {
                self.commandParameters.templateDisplayName = templateDisplayName;
                return self.finalize();
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

    private createProject(): Q.Promise<any> {
        var isKitProject: boolean = !this.commandParameters.data.options["cli"];
        var mustUseTemplate: boolean = isKitProject && !this.commandParameters.data.options["copy-from"] && !this.commandParameters.data.options["link-to"];

        if (!isKitProject) {
            // TODO Create CLI project here
            return Q.resolve(null);
        } else {
            var kitId: string = this.commandParameters.data.options["kit"];
            var templateId: string = this.commandParameters.data.options["template"];
            var projectPath: string = this.commandParameters.projectPath;
            var appId: string = this.commandParameters.appId;
            var appName: string = this.commandParameters.appName;
            var cordovaConfig: string = this.commandParameters.cordovaConfig;
            var options: { [option: string]: any } = this.commandParameters.data.options;

            if (mustUseTemplate) {
                return createManager.CreateManager.createKitProjectWithTemplate(kitId, templateId, projectPath, appId, appName, cordovaConfig, options);
            } else {
                return createManager.CreateManager.createKitProjectWithCustomWww(kitId, projectPath, appId, appName, cordovaConfig, options);
            }
        }
    }

    private finalize(): Q.Promise<any> {
        // Report success over multiple loggings for different styles
        logger.log(resources.getString("command.create.success.base"), logger.Level.Success);
        logger.log(" " + resources.getString("command.create.success.readyForUse"), logger.Level.Normal);
        logger.logLine(" " + resources.getString("command.create.success.path", this.commandParameters.projectPath), logger.Level.NormalBold);

        return Q.resolve(null);
    }
}

export = Create;