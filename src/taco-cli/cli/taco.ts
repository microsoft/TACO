/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/cordovaExtensions.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/tacoHelpArgs.d.ts"/>
/// <reference path="../../typings/tacoKits.d.ts" />
/// <reference path="../../typings/tacoUtils.d.ts" />

"use strict";

import path = require ("path");
import Q = require ("q");

import cordovaWrapper = require ("./utils/cordovaWrapper");
import kitHelper = require ("./utils/kitHelper");
import projectHelper = require ("./utils/projectHelper");
import resources = require ("../resources/resourceManager");
import TacoErrorCodes = require ("./tacoErrorCodes");
import errorHelper = require ("./tacoErrorHelper");
import tacoUtility = require ("taco-utils");

import commands = tacoUtility.Commands;
import CommandsFactory = commands.CommandFactory;
import logger = tacoUtility.Logger;
import TacoError = tacoUtility.TacoError;
import telemetry = tacoUtility.Telemetry;
import telemetryHelper = tacoUtility.TelemetryHelper;
import ICommandTelemetryProperties = tacoUtility.ICommandTelemetryProperties;
import UtilHelper = tacoUtility.UtilHelper;

interface IParsedArgs {
    args: string[];
    command: commands.TacoCommandBase;
    commandName: string;
}

/*
 * Taco
 *
 * Main Taco class
 */
class Taco { 
    /*
     * Runs taco with command line args
     */
    public static run(): void {
        telemetry.init(require("../package.json").name, require("../package.json").version);
        
        var parsedArgs: IParsedArgs = Taco.parseArgs(process.argv.slice(2));
        var commandProperties: ICommandTelemetryProperties = {};
        
        Taco.runWithParsedArgs(parsedArgs)
        .then(function (): void {
            if (parsedArgs.command) {
                parsedArgs.command.getTelemetryProperties().then(function (properties: ICommandTelemetryProperties): void {
                    commandProperties = properties;
                });
            }
        }).done(function (): void {
            telemetryHelper.sendCommandSuccessTelemetry(parsedArgs.commandName, commandProperties, parsedArgs.args);
        }, function (reason: any): any {
            // Pretty print errors
            if (reason) {
                telemetryHelper.sendCommandFailureTelemetry(parsedArgs.commandName, reason, parsedArgs.args);
                if (reason.isTacoError) {
                    logger.logError((<tacoUtility.TacoError>reason).toString());
                } else if (reason.message) {
                    logger.logError(errorHelper.wrap(TacoErrorCodes.CommandError, reason).toString());
                } 
            }
            
            process.exit(1);
        });
    }

    /*
     * runs taco with parsed args ensuring proper initialization
     */
    public static runWithParsedArgs(parsedArgs: IParsedArgs): Q.Promise<any> {
        return Q({})
            .then(function (): Q.Promise<any> {
                projectHelper.cdToProjectRoot();

                // if no command found that can handle these args, route args directly to Cordova
                if (parsedArgs.command) {
                    var commandData: tacoUtility.Commands.ICommandData = { options: {}, original: parsedArgs.args, remain: parsedArgs.args };
                    return parsedArgs.command.run(commandData);
                } else {
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

    /*
     * runs taco with raw args ensuring proper initialization
     */
    public static runWithArgs(args: string[]): Q.Promise<any> {
        return Taco.runWithParsedArgs(Taco.parseArgs(process.argv.slice(2)));
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

        return <IParsedArgs>{ command: command, args: command ? commandArgs : args, commandName: commandName || command.name};
    }
}

export = Taco;
