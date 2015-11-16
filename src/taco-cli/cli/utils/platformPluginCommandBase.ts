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

import cordovaWrapper = require ("./cordovaWrapper");
import cordovaHelper = require ("./cordovaHelper");
import kitHelper = require ("./kitHelper");
import projectHelper = require ("./projectHelper");
import resources = require ("../../resources/resourceManager");
import TacoErrorCodes = require ("../tacoErrorCodes");
import errorHelper = require ("../tacoErrorHelper");
import tacoKits = require ("taco-kits");
import tacoUtility = require ("taco-utils");
import commands = tacoUtility.Commands;
import logger = tacoUtility.Logger;
import packageLoader = tacoUtility.TacoPackageLoader;
import telemetryHelper = tacoUtility.TelemetryHelper;
import utils = tacoUtility.UtilHelper;

import ICommandTelemetryProperties = tacoUtility.ICommandTelemetryProperties;

export enum CommandOperationStatus {
    Error = -1,
    InProgress = 0,
    Success = 1
};

/**
 * PlatfromPluginCommandBase
 *
 * Base handler for platform and plugin commands
 */
export class PlatformPluginCommandBase extends commands.TacoCommandBase {
    private static KNOWN_OPTIONS: Nopt.CommandData = {
        searchpath: String,
        noregistry: String,
        usegit: String,
        variable: Array,
        browserify: Boolean,
        link: Boolean,
        save: Boolean,
        shrinkwrap: Boolean
    };

    private static SHORT_HANDS: Nopt.ShortFlags = {
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
     * Checks if the component has a version specification in config.xml of the cordova project
     */
    public configXmlHasVersionOverride(componentName: string, projectInfo: projectHelper.IProjectInfo): Q.Promise<boolean> {
        throw errorHelper.get(TacoErrorCodes.UnimplementedAbstractMethod);
    }

    /**
     * Abstract method to be implemented by the derived class.
     * Edits the version override info to config.xml of the cordova project
     */
    public editVersionOverrideInfo(specs: Cordova.ICordovaPlatformPluginInfo[], projectInfo: projectHelper.IProjectInfo, add: boolean): Q.Promise<any> {
        throw errorHelper.get(TacoErrorCodes.UnimplementedAbstractMethod);
    }

    /**
     * Checks the component (platform/plugin) specification to determine if the user has attempted an override.
     * Overrides can be packageSpec@<version> / packageSpec@<git-url> / packageSpec@<filepath>
     * Do not check for overrides from kit metadata if user explicitly overrides the package on command-line
     */
    public cliParamHasVersionOverride(spec: string): boolean {
        var packageVersion: string = spec.indexOf("@") !== 0 ? spec.split("@")[1] : null;
        return !!packageLoader.GIT_URI_REGEX.test(spec) || !!packageLoader.FILE_URI_REGEX.test(spec) || (packageVersion && !!semver.valid(packageVersion));
    }

    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
        return true;
    }

    public run(data: commands.ICommandData): Q.Promise<ICommandTelemetryProperties> {
        try {
            this.parseArguments(data);
        } catch (err) {
            return Q.reject<ICommandTelemetryProperties>(err);
        }

        var self: PlatformPluginCommandBase = this;
        var projectInfo: projectHelper.IProjectInfo;
        var specsToPersist: Cordova.ICordovaPlatformPluginInfo[] = [];
        return projectHelper.getProjectInfo().then(function (info: projectHelper.IProjectInfo): Q.Promise<any> {
            projectInfo = info;
            return Q({});
        })
            .then(function (): Q.Promise<any> {
            var kitId: string = projectInfo.tacoKitId;
            if (kitId) {
                return self.checkForKitOverrides(projectInfo).then(function (specs: Cordova.ICordovaPlatformPluginInfo[]): void {
                    specsToPersist = specs;
                });
            } else {
                return Q({});
            }
        })
            .then(function (): Q.Promise<any> {
            return cordovaWrapper.invokePlatformPluginCommand(self.name, self.cordovaCommandParams, data);
        })
            .then(function (): Q.Promise<any> {
            if (specsToPersist && specsToPersist.length > 0) {
                return self.editVersionOverrideInfo(specsToPersist, projectInfo, self.cordovaCommandParams.subCommand.toLowerCase() === "add");
            } else {
                return Q({});
            }
        })
            .then(function (): Q.Promise<any> {
            self.printStatusMessage(self.cordovaCommandParams.targets, self.cordovaCommandParams.subCommand, CommandOperationStatus.Success);
            return Q({});
        })
            .then(function (): Q.Promise<ICommandTelemetryProperties> {
            return self.generateTelemetryProperties();
        });
    }

    /**
     * Generates the telemetry properties for the platform/plugin operation
     */
    private generateTelemetryProperties(): Q.Promise<ICommandTelemetryProperties> {
        var self: PlatformPluginCommandBase = this;
        return projectHelper.getCurrentProjectTelemetryProperties().then(function (telemetryProperties: ICommandTelemetryProperties): Q.Promise<ICommandTelemetryProperties> {
            var numericSuffix: number = 1;
            telemetryProperties["subCommand"] = telemetryHelper.telemetryProperty(self.cordovaCommandParams.subCommand);
            self.cordovaCommandParams.targets.forEach(function (target: string): void {
                telemetryProperties["target" + numericSuffix] = telemetryHelper.telemetryProperty(target, true);
                numericSuffix++;
            });

            return Q.resolve(telemetryHelper.addPropertiesFromOptions(telemetryProperties, PlatformPluginCommandBase.KNOWN_OPTIONS, self.data.options, ["link", "save", "browserify", "shrinkwrap"]));
        });
    }

    private operationRequiresTargets(subCommand: string): boolean {
        return (subCommand === "add" || subCommand === "remove" || subCommand === "update");
    }

    /**
     * Parse the arguments and construct the command parameters.
     */
    private parseArguments(args: commands.ICommandData): void {
        var commandData: commands.ICommandData = tacoUtility.ArgsHelper.parseArguments(PlatformPluginCommandBase.KNOWN_OPTIONS, PlatformPluginCommandBase.SHORT_HANDS, args.original, 0);
        var subCommand: string = commandData.remain[0];
        var targets: string[] = commandData.remain.slice(1);

        targets = targets.filter(function (name: string): boolean {
            return !!name && name.length > 0;
        });

        if (this.operationRequiresTargets(subCommand) && targets.length === 0) {
            throw errorHelper.get(TacoErrorCodes.ErrorNoPluginOrPlatformSpecified, this.name, subCommand);
        }

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

        var variables: string[] = commandData.options["variable"];

        // Sanitize the --variable option flags
        if (variables) {
            var self: PlatformPluginCommandBase = this;
            variables.forEach(function (variable: string): void {
                var keyval: any[] = variable.split("=");
                var key: string = keyval[0].toUpperCase();
                self.downloadOptions.cli_variables[key] = keyval[1];
            });
        }

        this.data = commandData;

        // Set appropriate subcommand, target and download options
        this.cordovaCommandParams = {
            subCommand: commandData.remain[0],
            targets: targets,
            downloadOptions: this.downloadOptions
        };
    }
}
