/// <reference path="../../typings/taco-utils.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />

import tacoUtility = require("taco-utils");
import utils = tacoUtility.UtilHelper;
import commands = tacoUtility.Commands;
import resources = tacoUtility.ResourcesManager;
import logger = tacoUtility.Logger;
import cordovaWrapper = require("./utils/cordova-wrapper");
import level = logger.Level;
import nopt = require("nopt");
import Q = require("q");

/*
 * Create
 *
 * handles "Taco Create"
 */
class Create implements commands.IDocumentedCommand {
    public info: commands.ICommandInfo;

    private static tacoOnlyOptions: string[] = ["kit", "cli", "template"];
    private static knownOptions: Nopt.FlagTypeMap = {
        // taco-cli options
        "kit": String,
        "template": String,
        "cli": String,

        // Cordova options
        "copy-from": String,
        "link-to": String
    };

    private commandData: commands.ICommandData;

    public run(data: commands.ICommandData): Q.Promise<any> {
        return this.parseArguments(data)
            .then(this.verifyArguments)
            .then(this.processKit)
            .then(this.processTemplate)
            .then(this.callCordovaCreate)
            .then(this.copyRemainingTemplateItemsIfNeeded)
            .then(this.processTemplateTokensIfNeeded);
    }

    private parseArguments(args: commands.ICommandData): Q.Promise<commands.ICommandData> {
        this.commandData = utils.parseArguments(Create.knownOptions, {}, args.original, 0);
        return Q.resolve<any>(null);
    }

    private verifyArguments(): Q.Promise<any> {
        // Parameter exclusivity validation and other verifications
        if (this.commandData.options["template"] && (this.commandData.options["copy-from"] || this.commandData.options["link-to"])) {
            logger.logErrorLine(resources.getString("command.create.notTemplateIfCustomWww"));
            return Q.reject("command.create.notTemplateIfCustomWww");
        }

        if (this.commandData.options["cli"] && this.commandData.options["kit"]) {
            logger.logErrorLine(resources.getString("command.create.notBothCliAndKit"));
            return Q.reject("command.create.notBothCliAndKit");
        }

        if (this.commandData.options["cli"] && this.commandData.options["template"]) {
            logger.logWarnLine(resources.getString("command.create.notBothTemplateAndCli"));
        }

        return Q.resolve(null);
    }

    private processKit(): Q.Promise<any> {
        return Q.resolve(null);
    }

    private processTemplate(): Q.Promise<any> {
        return Q.resolve(null);
    }

    private callCordovaCreate(): Q.Promise<any> {
        // Create the flag bag to pass to Cordova, stripping out any flag that is specific to taco-cli
        var cfg: { [flag: string]: any } = {};

        for (var option in this.commandData.options) {
            if (Create.tacoOnlyOptions.indexOf(option) === -1) {
                // This is not an option we understand; pass it through to Cordova
                cfg[option] = this.commandData.options[option];
            }
        }

        return cordovaWrapper.create(this.commandData.remain[0], this.commandData.remain[1], this.commandData.remain[2], this.commandData.remain[3], cfg);
    }

    private copyRemainingTemplateItemsIfNeeded(): Q.Promise<any> {
        return Q.resolve(null);
    }

    private processTemplateTokensIfNeeded(): Q.Promise<any> {
        return Q.resolve(null);
    }

    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
        return true;
    }
}

export = Create;