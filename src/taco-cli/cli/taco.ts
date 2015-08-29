/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/cordovaExtensions.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/tacoHelpArgs.d.ts"/>
/// <reference path="../../typings/tacoKits.d.ts" />
/// <reference path="../../typings/tacoUtils.d.ts" />

"use strict";

import os = require ("os");
import path = require ("path");
import Q = require ("q");

import cordovaWrapper = require ("./utils/cordovaWrapper");
import kitHelper = require ("./utils/kitHelper");
import projectHelper = require ("./utils/projectHelper");
import resources = require ("../resources/resourceManager");
import Settings = require ("./utils/settings");
import TacoErrorCodes = require ("./tacoErrorCodes");
import errorHelper = require ("./tacoErrorHelper");
import tacoUtility = require ("taco-utils");
import CheckForNewerVersion = require ("./utils/checkForNewerVersion");

import commands = tacoUtility.Commands;
import CommandsFactory = commands.CommandFactory;
import logger = tacoUtility.Logger;
import LogLevel = tacoUtility.LogLevel;
import TacoError = tacoUtility.TacoError;
import TacoGlobalConfig = tacoUtility.TacoGlobalConfig;
import telemetry = tacoUtility.Telemetry;
import telemetryHelper = tacoUtility.TelemetryHelper;
import ICommandTelemetryProperties = tacoUtility.ICommandTelemetryProperties;
import UtilHelper = tacoUtility.UtilHelper;

interface IParsedArgs {
    args: string[];
    command: commands.TacoCommandBase;
    commandName: string;
}

/**
 * Taco
 *
 * Main Taco class
 */
class Taco { 
    /**
     * Runs taco with command line args
     */
    public static run(): void {
        Settings.loadSettings().fail(function (err: any): Q.Promise<Settings.ISettings> {
            require("./logo"); // Prints the logo as a side effect of requiring it. Require caching will make sure we don't execute it twice in the one session.
            return Settings.saveSettings({});
        }).then(function (settings: Settings.ISettings): void {
            // TODO: opt in/out of telemetry based on settings
            telemetry.init("TACO", require("../package.json").version);
            TacoGlobalConfig.lang = "en"; // Disable localization for now so we don't get partially localized content.

            // We check if there is a new taco-cli version available, and if so, we print a message before exiting the application
            new CheckForNewerVersion().showOnExitAndIgnoreFailures();

            var parsedArgs: IParsedArgs = Taco.parseArgs(process.argv.slice(2));
            var commandProperties: ICommandTelemetryProperties = {};

            Taco.runWithParsedArgs(parsedArgs)
                .then(function (telemetryProperties: ICommandTelemetryProperties): void {
                    if (parsedArgs.command) {
                        commandProperties = telemetryProperties;
                    }
                }).then(function (): void {
                    // Send command success telemetry
                    telemetryHelper.sendCommandSuccessTelemetry(parsedArgs.commandName, commandProperties, parsedArgs.args);
                }, function (reason: any): any {
                    // set exit code to report error
                    process.on("exit", function (): void { process.exit(1); });

                    // Pretty print errors
                    if (reason) {
                        if (reason.isTacoError) {
                            logger.logError((<tacoUtility.TacoError>reason).toString());
                        } else {
                            var toPrint: string = reason.toString();

                            // If we have a loglevel of diagnostic, and there is a stack, replace the error message with the stack (the stack contains the error message already)
                            if (TacoGlobalConfig.logLevel === LogLevel.Diagnostic && reason.stack) {
                                toPrint = reason.stack;
                            }

                            logger.logError(toPrint);
                        }

                        // Send command failure telemetry
                        return projectHelper.getCurrentProjectTelemetryProperties().then(function (telemetryProperties: ICommandTelemetryProperties): void {
                            telemetryHelper.sendCommandFailureTelemetry(parsedArgs.commandName, reason, telemetryProperties, parsedArgs.args);
                        });
                    }
                }).finally((): any => telemetry.sendPendingData());
        });
    }

    /**
     * runs taco with parsed args ensuring proper initialization
     */
    public static runWithParsedArgs(parsedArgs: IParsedArgs): Q.Promise<ICommandTelemetryProperties> {
        return Q({})
            .then(function (): Q.Promise<any> {
                projectHelper.cdToProjectRoot();

                // if no command found that can handle these args, route args directly to Cordova
                if (parsedArgs.command) {
                    var commandData: tacoUtility.Commands.ICommandData = { options: {}, original: parsedArgs.args, remain: parsedArgs.args };
                    return parsedArgs.command.run(commandData);
                } else {
                    logger.logWarning(resources.getString("TacoCommandPassthrough"));
                    
                    var routeToCordovaEvent = new telemetry.TelemetryEvent(telemetry.appName + "/routedcommand");
                    telemetryHelper.addTelemetryEventProperty(routeToCordovaEvent, "argument", parsedArgs.args, true);
                    return cordovaWrapper.cli(parsedArgs.args).then(function (output: any): any {
                        routeToCordovaEvent.properties["success"] = "true";
                        telemetry.send(routeToCordovaEvent);
                        return Q(output);
                    }, function (reason: any): any {
                        routeToCordovaEvent.properties["success"] = "false";
                        telemetry.send(routeToCordovaEvent);
                        return Q.reject(reason);
                    });
                }
            });
    }

    /**
     * runs taco with raw args ensuring proper initialization
     */
    public static runWithArgs(args: string[]): Q.Promise<any> {
        return Taco.runWithParsedArgs(Taco.parseArgs(args));
    }

    private static parseArgs(args: string[]): IParsedArgs {
        var commandName: string = null;
        var commandArgs: string[] = null;

        // if version flag found, mark input as version and continue
        if (UtilHelper.tryParseVersionArgs(args)) {
            commandName = "version";
            commandArgs = [];
        } else {
            var helpArgs: ITacoHelpArgs = UtilHelper.tryParseHelpArgs(args);
            if (helpArgs) {
                commandName = "help";
                commandArgs = helpArgs.helpTopic ? [helpArgs.helpTopic] : [];
            } else {
                commandName = args[0] || "help";
                commandArgs = args.slice(1);
            }
        }

        // Set the loglevel global setting
        UtilHelper.initializeLogLevel(args);

        var commandsFactory: CommandsFactory = new CommandsFactory(path.join(__dirname, "./commands.json"));
        var command: commands.TacoCommandBase = commandsFactory.getTask(commandName, commandArgs, __dirname);

        return <IParsedArgs>{ command: command, args: command ? commandArgs : args, commandName: commandName || command.name };
    }
}

export = Taco;
