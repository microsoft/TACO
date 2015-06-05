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

import fs = require("fs");
import nopt = require("nopt");
import path = require("path");
import Q = require("q");

import cordovaHelper = require("./utils/cordovaHelper");
import cordovaWrapper = require("./utils/cordovaWrapper");
import projectHelper = require("./utils/projectHelper");
import resources = require("../resources/resourceManager");
import tacoKits = require("taco-kits");
import TacoErrorCodes = require("./tacoErrorCodes");
import errorHelper = require("./tacoErrorHelper");
import tacoUtility = require("taco-utils");
import templateManager = require("./utils/templateManager");

import commands = tacoUtility.Commands;
import kitHelper = tacoKits.KitHelper;
import logger = tacoUtility.Logger;
import level = logger.Level;
import tacoProjectHelper = projectHelper.TacoProjectHelper;
import utils = tacoUtility.UtilHelper;

/* 
 * Wrapper interface for Plugin command parameters
 */
interface IPluginParameters {
    cordovaParameters: cordovaHelper.ICordovaCreateParameters;
    data: commands.ICommandData;
}

/*
 * Plugin
 *
 * Handles "taco Plugin"
 */
class Plugin implements commands.IDocumentedCommand {
    private static KnownOptions: Nopt.CommandData = {
        searchpath: String,
        noregistry: String,
        usegit: String,
        variable: Array,
        browserify: Boolean,
        link: Boolean,
        save: Boolean,
        shrinkwrap: Boolean
    };

    private static ShortHands: Nopt.ShortFlags = {
        rm: "remove",
        ls: "list"
    };

    public name: string = "Plugin";
    public info: commands.ICommandInfo;

    private cordovaPluginParams: cordovaHelper.ICordovaPlatformParameters;
    private downloadOptions: cordovaHelper.ICordovaPlatformDownloadOptions;


    public run(data: commands.ICommandData): Q.Promise<any> {
        try {
            this.parseArguments(data);
            this.verifyArguments();
        } catch (err) {
            return Q.reject(err);
        }  
        return tacoProjectHelper.getProjectInfo().then(function (projectInfo: projectHelper.IProjectInfo): Q.Promise <any> {
            if (!projectInfo.isTacoProject) {
                return Q({});
            }
            return cordovaWrapper.plugin(projectInfo.cordovaCliVersion, this.cordovaPluginParams);
        });
    }


    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
        return true;
    }

    private parseArguments(args: commands.ICommandData): void {
        var commandData: commands.ICommandData = tacoUtility.ArgsHelper.parseArguments(Plugin.KnownOptions, Plugin.ShortHands, args.original, 0);
        var subCommand: string = commandData.remain[0];
        var targets: string = commandData.remain[1];

        this.downloadOptions = {
            searchpath: commandData.options["searchpath"],
            noregistry: commandData.options["noregistry"],
            usegit: commandData.options["usegit"],
            cli_variables: {},
            browserify: commandData.options["browserify"],
            link: commandData.options["link"],
            save: commandData.options["save"],
            shrinkwrap: commandData.options["shrinkwrap"]
        };

        var variables: Array<string> = commandData.options["variable"];
        if (variables) {
            variables.forEach(function (s) {
                var keyval = s.split('=');
                var key = keyval[0].toUpperCase();
                this.downloadOptions.cli_variables[key] = keyval[1];
            });
        }

        this.cordovaPluginParams = {
            subCommand: commandData.remain[0],
            targets: commandData.remain.slice(1),
            downloadOptions: this.downloadOptions
        };


    }

    /**
     * Verify that the right combination of options is passed
     */
    private verifyArguments(): void {
        // Parameter exclusivity validation and other verifications
        //if (this.commandParameters.data.options["template"] && (this.commandParameters.data.options["copy-from"] || this.commandParameters.data.options["link-to"])) {
        //    throw errorHelper.get(TacoErrorCodes.CommandCreateNotTemplateIfCustomWww);
        //}

        //if (this.commandParameters.data.options["cli"] && this.commandParameters.data.options["kit"]) {
        //    throw errorHelper.get(TacoErrorCodes.CommandCreateNotBothCliAndKit);
        //}

        //if (this.commandParameters.data.options["cli"] && this.commandParameters.data.options["template"]) {
        //    throw errorHelper.get(TacoErrorCodes.CommandCreateNotBothTemplateAndCli);
        //}
    }

    /**
     * Prints the project creation status message
     */
    private printStatusMessage(): Q.Promise<any> {
        var deferred: Q.Deferred<any> = Q.defer<any>();

        //logger.log(resources.getString("CommandCreateStatusProjectName"), logger.Level.Normal);
        //logger.log(this.commandParameters.cordovaParameters.appName, logger.Level.NormalBold);
        //logger.log(resources.getString("CommandCreateStatusProjectId"), logger.Level.Normal);
        //logger.log(this.commandParameters.cordovaParameters.appId, logger.Level.NormalBold);

        //if (this.commandParameters.cordovaParameters.projectPath) {
        //    logger.log(resources.getString("CommandCreateStatusProjectPath"), logger.Level.Normal);
        //    logger.log(path.resolve(this.commandParameters.cordovaParameters.projectPath), logger.Level.NormalBold);
        //}

        //if (!this.isKitProject()) {
        //    logger.log(resources.getString("CommandCreateStatusCordovaCliUsed"), logger.Level.Normal);
        //    logger.log(this.commandParameters.data.options["cli"], logger.Level.NormalBold);
        //    logger.log(resources.getString("CommandCreateStatusNoKitUsed"), logger.Level.Normal);
        //    logger.logLine("...", logger.Level.Normal);
        //    logger.log("\n");
        //} else {
        //    var self = this;

        //    return kitHelper.getDefaultKit()
        //        .then(function (defaultKitId: string): void {
        //        var kitId: string = self.commandParameters.data.options["kit"];

        //        if (!kitId) {
        //            kitId = defaultKitId;
        //        }

        //        logger.log(resources.getString("CommandCreateStatusKitIdUsed"), logger.Level.Normal);
        //        logger.log(kitId, logger.Level.NormalBold);
        //        logger.logLine("...", logger.Level.Normal);
        //        logger.log("\n");
        //    });
        //}

        //deferred.resolve({});

        return deferred.promise;
    }

    /**
     * Finalizes the creation of project by printing the Success messages with information about the Kit and template used
     */
    private finalize(templateDisplayName: string): void {
        // Report success over multiple loggings for different styles
        //logger.log("\n", logger.Level.Normal);
        //logger.log(resources.getString("CommandSuccessBase"), logger.Level.Success);

        //if (this.isKitProject()) {
        //    if (templateDisplayName) {
        //        logger.log(" " + resources.getString("CommandCreateSuccessProjectTemplate", templateDisplayName), logger.Level.Normal);
        //    } else {
        //        // If both --copy-from and --link-to are specified, Cordova uses --copy-from and ignores --link-to, so for our message we should use the path provided to --copy-from if the user specified both
        //        var customWwwPath: string = this.commandParameters.data.options["copy-from"] ? this.commandParameters.data.options["copy-from"] : this.commandParameters.data.options["link-to"];

        //        logger.log(" " + resources.getString("CommandCreateSuccessProjectCustomWww", customWwwPath), logger.Level.Normal);
        //    }
        //} else {
        //    logger.log(" " + resources.getString("CommandCreateSuccessProjectCLI", customWwwPath), logger.Level.Normal);
        //}

        //logger.logLine(" " + resources.getString("CommandCreateSuccessPath", path.resolve(this.commandParameters.cordovaParameters.projectPath)), logger.Level.NormalBold);
    }
}

export = Plugin;
