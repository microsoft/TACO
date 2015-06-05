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
import tacoProjectHelper = projectHelper.TacoProjectHelper;
import utils = tacoUtility.UtilHelper;

/* 
 * Wrapper interface for platform command parameters
 */
interface IPlatformParameters {
    cordovaParameters: cordovaHelper.ICordovaCreateParameters;
    data: commands.ICommandData;
}

/*
 * Platform
 *
 * Handles "taco platform"
 */
class Platform implements commands.IDocumentedCommand {
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

    public name: string = "platform";
    public info: commands.ICommandInfo;

    private cordovaPlatformParams: cordovaHelper.ICordovaPlatformParameters;
    private downloadOptions: cordovaHelper.ICordovaPlatformDownloadOptions;


    public run(data: commands.ICommandData): Q.Promise<any> {
        try {
            this.parseArguments(data);
        } catch (err) {
            return Q.reject(err);
        }

        var self = this;
        var projectInfo: projectHelper.IProjectInfo;
        return tacoProjectHelper.getProjectInfo().then(function (info: projectHelper.IProjectInfo): void {
            projectInfo = info;
        })
            .then(function (): Q.Promise<any> {
                if (!projectInfo.isTacoProject) {
                    return Q({});
                } 
        })
            .then(function (): Q.Promise<any> {
                var kitId: string = projectInfo.tacoKitId;
                if (kitId) {
                    var targetString: string[] = [];
                    return kitHelper.getPlatformOverridesForKit(kitId).then(function (platformOverrides: TacoKits.IPlatformOverrideMetadata): Q.Promise<any> {
                        self.cordovaPlatformParams.targets.forEach(function (platformName: string): void {
                            var suffix: string = "";
                            if (platformOverrides[platformName]) {
                                suffix = "@" + platformOverrides[platformName].version ? platformOverrides[platformName].version : platformOverrides[platformName].src;
                            }
                            targetString.push(platformName + "@" + suffix);
                        });
                        console.log("Target String : " + targetString);
                        self.cordovaPlatformParams.targets = targetString;
                        return Q.resolve({});
                    });
                    self.cordovaPlatformParams.targets = targetString;
                    return Q.resolve({});
                } 
        })
            .then(function (): Q.Promise<any> {
                return cordovaWrapper.platform(projectInfo.cordovaCliVersion, self.cordovaPlatformParams);
        });
    }


    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
        return true;
    }

    private parseArguments(args: commands.ICommandData): void {
        console.log("args.original : " + args.original + "\n");
        var commandData: commands.ICommandData = tacoUtility.ArgsHelper.parseArguments(Platform.KnownOptions, Platform.ShortHands, args.original, 0);
        var subCommand: string = commandData.remain[0];
        var targets: string = commandData.remain.slice(1).join(" ");
        console.log("Subcommand : " + commandData.remain[0] + "\n");
        console.log("commandData.remain : " + commandData.remain + "\n");
        console.log("commandData.remain[1] : " + commandData.remain[1] + "\n");
        console.log("commandData.options : " + commandData.options + "\n");
        console.log("commandData.options[\"variable\"] : " + commandData.options["variable"] + "\n");
        console.log("commandData.options[\"shrinkwrap\"] :" + commandData.options["shrinkwrap"] + "\n");
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
            var self = this;
            variables.forEach(function (s) {
                var keyval = s.split('=');
                var key = keyval[0].toUpperCase();
                self.downloadOptions.cli_variables[key] = keyval[1];
            });
        }

        this.cordovaPlatformParams = {
            subCommand: commandData.remain[0],
            targets: commandData.remain.slice(1),
            downloadOptions: this.downloadOptions
        };

        console.log("Subcommand : " + this.cordovaPlatformParams.subCommand + "\n");
        console.log("targets : " + this.cordovaPlatformParams.targets + "\n");
        console.log("downloadOptions : " + this.cordovaPlatformParams.downloadOptions + "\n");
    }

    /**
     * Prints the project creation status message
     */
    private printStatusMessage(platformName: string, version: string): Q.Promise<any> {
        var deferred: Q.Deferred<any> = Q.defer<any>();
        return deferred.promise;
    }
}

export = Platform;
