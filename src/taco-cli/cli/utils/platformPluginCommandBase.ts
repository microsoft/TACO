/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/Q.d.ts" />
/// <reference path="../../../typings/semver.d.ts" />
/// <reference path="../../../typings/tacoKits.d.ts" />

"use strict";

import path = require ("path");
import Q = require ("q");
import semver = require ("semver");
import util = require ("util");

import cordovaHelper = require ("./cordovaHelper");
import cordovaWrapper = require ("./cordovaWrapper");
import projectHelper = require ("./projectHelper");
import resources = require ("../../resources/resourceManager");
import TacoErrorCodes = require ("../tacoErrorCodes");
import errorHelper = require ("../tacoErrorHelper");
import tacoKits = require ("taco-kits");
import tacoUtility = require ("taco-utils");

import commands = tacoUtility.Commands;
import kitHelper = tacoKits.KitHelper;
import logger = tacoUtility.Logger;
import packageLoader = tacoUtility.TacoPackageLoader;
import utils = tacoUtility.UtilHelper;

export enum CommandOperationStatus {
    Error = -1,
    InProgress = 0,
    Success = 1
};

export interface ComponentVersionInfo{
    name: string;
    version: string;
};

/*
* PlatfromPluginCommandBase
*
* Base handler for platform and plugin commands
*/
export class PlatformPluginCommandBase implements commands.IDocumentedCommand {
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

    public name: string;
    
    public cordovaCommandParams: Cordova.ICordovaCommandParameters;
    public downloadOptions: Cordova.ICordovaDownloadOptions;
    public info: commands.ICommandInfo;
    /**
     * Abstract method to be implemented by the derived class.
     * Derived classes should override this method for kit override check functionality
     */
    public checkForKitOverrides(kitId: projectHelper.IProjectInfo): Q.Promise<any> {
        throw errorHelper.get(TacoErrorCodes.UnimplementedAbstractMethod);
    }

    /**
     * Abstract method to be implemented by the derived class.
     * Prints the status message indicating the platform/plugin addition process
     */
    public printStatusMessage(targets: string[], operation: string, status: CommandOperationStatus): void {
        throw errorHelper.get(TacoErrorCodes.UnimplementedAbstractMethod);
    }

    /**
     * Abstract method to be implemented by the derived class.
     * Checks the component (platform/plugin) specification to determine if the user has attempted an override.
     * Overrides can be packageSpec@<version> / packageSpec@<git-url> / packageSpec@<filepath>
     * Do not check for overrides from kit metadata if user explicitly overrides the package on command-line
     */
    public configXmlHasVersionOverride(componentName: string, configXmlPath: string, cordovaCliVersion: string): Q.Promise<boolean> {
        throw errorHelper.get(TacoErrorCodes.UnimplementedAbstractMethod);
    }

    /**
     * Abstract method to be implemented by the derived class.
     * Checks the component (platform/plugin) specification to determine if the user has attempted an override.
     * Overrides can be packageSpec@<version> / packageSpec@<git-url> / packageSpec@<filepath>
     * Do not check for overrides from kit metadata if user explicitly overrides the package on command-line
     */
    public saveVersionOverrideInfo(specsToPersist: Cordova.ICordovaPlatformPuginInfo[], configXmlPath: string, cordovaCliVersion: string): Q.Promise<boolean> {
        throw errorHelper.get(TacoErrorCodes.UnimplementedAbstractMethod);
    }

    /**
     * Checks the component (platform/plugin) specification to determine if the user has attempted an override.
     * Overrides can be packageSpec@<version> / packageSpec@<git-url> / packageSpec@<filepath>
     * Do not check for overrides from kit metadata if user explicitly overrides the package on command-line
     */
    public cliParamHasVersionOverride(spec: string): boolean {
        var packageVersion: string = spec.indexOf("@") !== 0 ? spec.split("@")[1] : null;
        return !!packageLoader.GitUriRegex.test(spec) || !!packageLoader.FileUriRegex.test(spec) || (packageVersion && !!semver.valid(packageVersion));

        // Also, check config.xml for override values - If there are, then we should not override with kit values
    }
   
    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
        return true;
    }

    public run(data: commands.ICommandData): Q.Promise<any> {
        try {
            this.parseArguments(data);
        } catch (err) {
            return Q.reject(err);
        }

        var self = this;
        var projectInfo: projectHelper.IProjectInfo;
        var specsToPersist:Cordova.ICordovaPlatformPuginInfo[] = [];
        return projectHelper.getProjectInfo().then(function (info: projectHelper.IProjectInfo): void {
            projectInfo = info;
        })
            .then(function (): Q.Promise<any> {
            if (!projectInfo.isTacoProject) {
                return Q.reject(errorHelper.get(TacoErrorCodes.NotACordovaProject));
            }
        })
            .then(function (): Q.Promise<any> {
            var kitId: string = projectInfo.tacoKitId;
            if (kitId) {
                return self.checkForKitOverrides(projectInfo).then(function (specs: Cordova.ICordovaPlatformPuginInfo[]): void {
                    specsToPersist = specs;
                });
            }
        })
            .then(function (): Q.Promise<any> {
            return cordovaWrapper.invokeCommand(self.name, projectInfo.cordovaCliVersion, self.cordovaCommandParams);
        })
            .then(function (): Q.Promise<any> {
            if (specsToPersist && specsToPersist.length > 0) {
                return self.saveVersionOverrideInfo(specsToPersist, projectInfo.configXmlPath, projectInfo.cordovaCliVersion);
            }
        })
            .then(function (): Q.Promise<any> {
            self.printStatusMessage(self.cordovaCommandParams.targets, self.cordovaCommandParams.subCommand, CommandOperationStatus.Success);
            return Q({});
        });
    }

    /**
     * Parse the arguments and construct the command parameters.
     */
    private parseArguments(args: commands.ICommandData): void {
        console.log("args.original : " + args.original + "\n");
        var commandData: commands.ICommandData = tacoUtility.ArgsHelper.parseArguments(PlatformPluginCommandBase.KnownOptions, PlatformPluginCommandBase.ShortHands, args.original, 0);
        var subCommand: string = commandData.remain[0];
        var targets: string[] = commandData.remain.slice(1);
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
        
        // Sanitize the --variable option flags
        if (variables) {
            var self = this;
            variables.forEach(function (variable: string): void {
                var keyval = variable.split("=");
                var key = keyval[0].toUpperCase();
                self.downloadOptions.cli_variables[key] = keyval[1];
            });
        }

        // Set appropriate subcommand, target and download options
        this.cordovaCommandParams = {
            subCommand: commandData.remain[0],
            targets: targets,
            downloadOptions: this.downloadOptions
        };
    }
}
