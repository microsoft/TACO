// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/Q.d.ts" />
/// <reference path="../../../typings/semver.d.ts" />
/// <reference path="../../../typings/tacoKits.d.ts" />

"use strict";

import path = require ("path");
import Q = require ("q");
import semver = require ("semver");
import util = require ("util");

import CliTelemetryHelper = require ("./cliTelemetryHelper");
import kitHelper = require ("./kitHelper");
import resources = require ("../../resources/resourceManager");
import TacoErrorCodes = require ("../tacoErrorCodes");
import errorHelper = require ("../tacoErrorHelper");
import tacoUtility = require ("taco-utils");

import commands = tacoUtility.Commands;
import CordovaHelper = tacoUtility.CordovaHelper;
import CordovaWrapper = tacoUtility.CordovaWrapper;
import logger = tacoUtility.Logger;
import packageLoader = tacoUtility.TacoPackageLoader;
import ProjectHelper = tacoUtility.ProjectHelper;
import PromiseUtils = tacoUtility.PromisesUtils;
import telemetryHelper = tacoUtility.TelemetryHelper;
import utils = tacoUtility.UtilHelper;

import ICommandTelemetryProperties = tacoUtility.ICommandTelemetryProperties;


interface ICordovaComponentCommandDataBase extends commands.ICommandData {
    subCommand: string,
    targets: string[];
};

/**
 * ICordovaComponentCommandData
 *
 * commandOptions for a kit component command
 */
export interface ICordovaComponentCommandData<T> extends ICordovaComponentCommandDataBase {
    commandOptions: T;
};

/**
 * ICordovaComponentInfo
 *
 * Represent the info for a kit component target which can be passed on to cordova
 */
export interface ICordovaComponentInfo {
    name?: string;
    spec?: string;
    targetId: string;
}

/**
 * CordovaComponentCommand
 *
 * Base class to handle add/remove operations for cordova components (platforms, plugins)
 */
export class CordovaComponentCommand extends commands.TacoCommandBase {

    protected get knownOptions(): Nopt.CommandData {
        throw errorHelper.get(TacoErrorCodes.UnimplementedAbstractMethod);
    }

    protected get knownSubCommands(): string[] {
        throw errorHelper.get(TacoErrorCodes.UnimplementedAbstractMethod);
    }

    protected get knownTargetsSubCommands(): string[] {
        throw errorHelper.get(TacoErrorCodes.UnimplementedAbstractMethod);
    }

    protected get shortFlags(): Nopt.ShortFlags {
        throw errorHelper.get(TacoErrorCodes.UnimplementedAbstractMethod);
    }

    /**
     * Runs the underlying cordova command to perform the required operation
     */
    protected runCordovaCommand(targets: string[]): Q.Promise<any> {
        throw errorHelper.get(TacoErrorCodes.UnimplementedAbstractMethod);
    }

    /**
     * Reads config.xml and returns the version overrides for a given target
     */
    protected getConfigXmlVersionSpec(targetName: string, projectInfo: IProjectInfo): Q.Promise<string> {
        throw errorHelper.get(TacoErrorCodes.UnimplementedAbstractMethod);
    }

    /**
     * Edits the version override info to config.xml of the cordova project
     */
    protected editVersionOverrideInfo(componentInfo: ICordovaComponentInfo[], projectInfo: IProjectInfo): Q.Promise<any> {
        throw errorHelper.get(TacoErrorCodes.UnimplementedAbstractMethod);
    }

    /**
     * Given a targetName (say android, cordova-camera-plugin) for a given kit, 
     * returns the overriden version/src values
     * returns null if target is not overridden for the given kit
     */
    protected getKitOverride(targetName: string, kitId: string): Q.Promise<ICordovaComponentInfo> {
        throw errorHelper.get(TacoErrorCodes.UnimplementedAbstractMethod);
    }

    /**
     * returns command options for a kit component command
     */
    protected getCommandOptions<T>(commandData: commands.ICommandData): T {
        throw errorHelper.get(TacoErrorCodes.UnimplementedAbstractMethod);
    }

    /**
     * Given bunch of targets getting added/removed prints a success message on the screen
     */
    protected printSuccessMessage(targets: string): void {
        throw errorHelper.get(TacoErrorCodes.UnimplementedAbstractMethod);
    }

    /**
     * Given bunch of targets getting added/removed prints a progress message on the screen
     */
    protected printInProgressMessage(targets: string): void {
        throw errorHelper.get(TacoErrorCodes.UnimplementedAbstractMethod);
    }

    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
        return true;
    }

    /**
     * Parse the arguments and construct the command parameters.
     */
    public parseArgs(args: string[]): commands.ICommandData {
        var commandData: commands.ICommandData = tacoUtility.ArgsHelper.parseArguments(this.knownOptions, this.shortFlags, args, 0);
        var subCommand: string = commandData.remain[0];

        var targets: string[] = commandData.remain.slice(1).filter(function(name: string): boolean {
            return !!name && name.length > 0;
        });

        if (targets.length === 0 && this.knownTargetsSubCommands.indexOf(subCommand) != -1) {
            throw errorHelper.get(TacoErrorCodes.ErrorNoPluginOrPlatformSpecified, this.name, subCommand);
        }

        return <ICordovaComponentCommandDataBase>{
            remain: commandData.remain,
            options: commandData.options,
            original: commandData.original,
            subCommand: this.resolveAlias(commandData.remain[0]),
            targets: commandData.remain.slice(1),
            commandOptions: this.getCommandOptions(commandData)
        };
    }

    /**
     * Performs add operation for a kit component
     */
    protected add(): Q.Promise<ICommandTelemetryProperties> {
        var commandData: ICordovaComponentCommandDataBase = <ICordovaComponentCommandDataBase>this.data;
        var self = this;

        return ProjectHelper.getProjectInfo()
            .then(function(projectInfo: IProjectInfo): Q.Promise<any> {
                if (!projectInfo.tacoKitId) {
                    return self.runCordovaCommand(commandData.targets)
                        .then(function() {
                            return self.generateTelemetryProperties();
                        });
                }

                return self.applyKitOverridesIfApplicable(projectInfo)
                    .then(function(componentInfos: ICordovaComponentInfo[]): Q.Promise<any> {

                        // Print status message
                        self.printInProgressMessage(CordovaComponentCommand.getTargetsForStatus(commandData.targets));

                        var targets: string[] = componentInfos.map(t => t.targetId);
                        return self.runCordovaCommand(targets)
                            .then(function(): Q.Promise<any> {
                                // Persist the specs which need to be persisted
                                return self.editVersionOverrideInfo(componentInfos.filter(t => t.spec != null), projectInfo);
                            })
                            .then(function() {
                                return self.generateTelemetryProperties(targets);
                            });
                    });
            });
    }

    /**
     * Passthrough method which calls into cordova to perform the required operation for a kit component
     */
    protected passthrough(): Q.Promise<ICommandTelemetryProperties> {
        var commandData: ICordovaComponentCommandDataBase = <ICordovaComponentCommandDataBase>this.data;
        var self = this;

        return this.runCordovaCommand(commandData.targets)
            .then(function() {
                return self.generateTelemetryProperties();
            });
    }

    /**
     * Checks for kit overrides for the targets and massages the command targets 
     * parameter to be consumed by the "platform" command
     */
    private applyKitOverridesIfApplicable(projectInfo: IProjectInfo): Q.Promise<ICordovaComponentInfo[]> {
        var commandData: ICordovaComponentCommandDataBase = <ICordovaComponentCommandDataBase>this.data;
        var self = this;

        // For each of the platforms specified at command-line, check for overrides in the current kit
        return PromiseUtils.chain<string, ICordovaComponentInfo[]>(commandData.targets, (targetId, targetSpecs) => {
            return self.getCordovaComponentInfo(targetId, projectInfo)
                .then(spec => {
                    targetSpecs.push(spec)
                    return targetSpecs;
                });
        }, [] /* initial value */);
    }

    private getCordovaComponentInfo(targetId: string, projectInfo: IProjectInfo): Q.Promise<ICordovaComponentInfo> {
        var self = this;
        // Proceed only if the version has not already been overridden on the command line or config.xml
        // i.e, proceed only if user did not do "taco platform <subcommand> platform@<verion|src>"
        return PromiseUtils.condition(self.isTargetVersionOverridden(targetId, projectInfo),
            // no spec to persist, if overridden
            { targetId: targetId }, 
            // cordova handles "cordova platform add foo@ and adds the foo@latest"
            () => self.getKitOverride(targetId.split("@")[0], projectInfo.tacoKitId));
    }

    public static makeCordovaComponentInfo(targetName: string, version: string, src: string): ICordovaComponentInfo {
        if (version) {
            return { name: targetName, spec: version, targetId: targetName + "@" + version };
        }
        if (src) {
            return { name: targetName, spec: src, targetId: src };
        }
        // no spec to persist, if not a kit plugin
        return { targetId: targetName, name: "", spec: "" };
    }

    /**
     * Generates the telemetry properties for the platform/plugin operation
     */
    private generateTelemetryProperties(targets?: string[]): Q.Promise<ICommandTelemetryProperties> {

        var commandData: ICordovaComponentCommandDataBase = <ICordovaComponentCommandDataBase>this.data;
        if (!targets) {
            targets = commandData.targets;
        }

        this.printSuccessMessage(CordovaComponentCommand.getTargetsForStatus(commandData.targets));

        var self: CordovaComponentCommand = this;
        return CliTelemetryHelper.getCurrentProjectTelemetryProperties()
            .then(function(telemetryProperties: ICommandTelemetryProperties): Q.Promise<ICommandTelemetryProperties> {

                telemetryProperties["subCommand"] = telemetryHelper.telemetryProperty(commandData.subCommand);
                for (var i: number = 0; i < targets.length; i++) {
                    telemetryProperties["target" + (i + 1)] = telemetryHelper.telemetryProperty(targets[i], true);
                }
                return Q(telemetryHelper.addPropertiesFromOptions(telemetryProperties, self.knownOptions, self.data.options, Object.keys(self.knownOptions)));
            });
    }

    private isTargetVersionOverridden(targetId: string, projectInfo: IProjectInfo): Q.Promise<boolean> {
        // check if target is overridden on CLI using @version, @tag, git URI, file URI or in config.xml
        var cliParamOveridden = !!(targetId.split("@")[1] || packageLoader.GIT_URI_REGEX.test(targetId) || packageLoader.FILE_URI_REGEX.test(targetId));

        var self = this;
        return PromiseUtils.or(cliParamOveridden, () => self.getConfigXmlVersionSpec(targetId, projectInfo)
            .then(function(versionSpec: string): boolean {
                return (versionSpec !== "");
            }));
    }

    private static getTargetsForStatus(targets: string[]): string {
        // Ignore git/file uris and strip off @version
        targets = targets || [];
        return targets.filter(target => {
            return !packageLoader.GIT_URI_REGEX.test(target) &&
                !packageLoader.FILE_URI_REGEX.test(target);
        }).map(target => target.split("@")[0]).join(",");
    }
}