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

import kitHelper = require ("./utils/kitHelper");
import resources = require ("../resources/resourceManager");
import Settings = require ("./utils/settings");
import TacoErrorCodes = require ("./tacoErrorCodes");
import errorHelper = require ("./tacoErrorHelper");
import tacoUtility = require ("taco-utils");
import CheckForNewerVersion = require ("./utils/checkForNewerVersion");
import CliTelemetryHelper = require ("./utils/cliTelemetryHelper");

import commands = tacoUtility.Commands;
import CommandsFactory = commands.CommandFactory;
import CordovaWrapper = tacoUtility.CordovaWrapper;
import logger = tacoUtility.Logger;
import LogLevel = tacoUtility.LogLevel;
import ProjectHelper = tacoUtility.ProjectHelper;
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
        Settings.loadSettings().fail(function(err: any): Q.Promise<Settings.ISettings> {
            // This is the first time TACO is invoked, so print the logo. Logo gets printed as a side effect of the require. Require caching will make sure we don't execute it twice in the one session.
            require("./logo");

            // Print the third-party disclaimer, and save the global setting for this session to prevent printing the disclaimer again
            logger.log(resources.getString("ThirdPartyDisclaimer"));

            return Settings.saveSettings({});
        }).then(function(settings: Settings.ISettings): Q.Promise<any> {
            return telemetry.init("TACO", require("../package.json").version);
        }).then(function(): void {
            TacoGlobalConfig.lang = "en"; // Disable localization for now so we don't get partially localized content.

            // We check if there is a new TACO version available, and if so, we print a message before exiting the application
            new CheckForNewerVersion().showOnExitAndIgnoreFailures();

            var parsedArgs: IParsedArgs = Taco.parseArgs(process.argv.slice(2));

            Taco.runWithParsedArgs(parsedArgs)
                .catch(function(reason: any): any {
                    // set exit code to report error
                    process.on("exit", function(): void { process.exit(1); });

                    // Pretty print errors
                    if (reason) {
                        if (reason.isTacoError) {
                            if (reason.errorLevel === tacoUtility.TacoErrorLevel.Warning) {
                                logger.logWarning(reason.message);
                            } else {
                                logger.logError((<tacoUtility.TacoError>reason).toString());
                            }
                        } else {
                            var toPrint: string = reason.toString();

                            // If we have a loglevel of diagnostic, and there is a stack, replace the error message with the stack (the stack contains the error message already)
                            if (TacoGlobalConfig.logLevel === LogLevel.Diagnostic && reason.stack) {
                                toPrint = reason.stack;
                            }

                            logger.logError(toPrint);
                        }

                        if (parsedArgs.command) {
                            // Send command failure telemetry for valid TACO commands
                            // Any invalid command will be routed to Cordova and 
                            // telemetry events for such commands are sent as "routedCommand" telemetry events
                            return CliTelemetryHelper.getCurrentProjectTelemetryProperties().then(function(telemetryProperties: ICommandTelemetryProperties): void {
                                telemetryHelper.sendCommandFailureTelemetry(parsedArgs.commandName, reason, telemetryProperties, parsedArgs.args);
                            });
                        }
                    }
                }).finally((): any => {
                    // Make sure to leave a line after the last of our output
                    logger.logLine();
                    telemetry.sendPendingData();
                }).done();
        });
    }

    /**
     * runs taco with parsed args ensuring proper initialization
     */
    public static runWithParsedArgs(parsedArgs: IParsedArgs): Q.Promise<any> {
        return Q({})
            .then(function(): Q.Promise<any> {
                ProjectHelper.cdToProjectRoot();

                // if no command found that can handle these args, route args directly to Cordova
                if (parsedArgs.command) {
                    return parsedArgs.command.run(parsedArgs.args)
                        .then(function(telemetryProperties: ICommandTelemetryProperties) {
                            // Send command success telemetry
                            telemetryHelper.sendCommandSuccessTelemetry(parsedArgs.commandName, telemetryProperties, parsedArgs.args);
                        });
                }

                logger.logWarning(resources.getString("TacoCommandPassthrough"));
                var routeToCordovaEvent: telemetry.TelemetryEvent = new telemetry.TelemetryEvent(telemetry.appName + "/routedcommand");
                telemetryHelper.addTelemetryEventProperty(routeToCordovaEvent, "argument", parsedArgs.args, true);
                return CordovaWrapper.cli(parsedArgs.args).then(function(output: any): any {
                    routeToCordovaEvent.properties["success"] = "true";
                    telemetry.send(routeToCordovaEvent);
                    return Q(output);
                }, function(reason: any): any {
                    routeToCordovaEvent.properties["success"] = "false";
                    telemetry.send(routeToCordovaEvent);
                    return Q.reject(reason);
                });
            });
    }

    /**
     * runs taco with raw args ensuring proper initialization
     */
    public static runWithArgs(args: string[]): Q.Promise<any> {
        return Taco.runWithParsedArgs(Taco.parseArgs(args));
    }

    private static parseArgs(args: string[]): IParsedArgs {
        // Initialize global settings
        args = UtilHelper.initializeLogLevel(args);
        args = UtilHelper.initializeNoPrompt(args);

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

        var commandsFactory: CommandsFactory = new CommandsFactory(path.join(__dirname, "./commands.json"));
        var command: commands.TacoCommandBase = commandsFactory.getTask(commandName, commandArgs, __dirname);

        return <IParsedArgs> { command: command, args: command ? commandArgs : args, commandName: commandName || command.name };
    }
}

export = Taco;
