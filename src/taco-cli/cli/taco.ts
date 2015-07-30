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
import UtilHelper = tacoUtility.UtilHelper;

interface IParsedArgs {
    args: string[];
    command: commands.ICommand;
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
        telemetry.init(require("../package.json").version);
        Taco.runWithArgs(process.argv.slice(2)).done(null, function (reason: any): any {
            // Pretty print taco Errors
            if (reason) {
                if (reason.isTacoError) {
                    tacoUtility.Logger.logError((<tacoUtility.TacoError>reason).toString());
                } else if (reason.message) {
                    tacoUtility.Logger.logError(reason.message);
                } 
            }
            // Print the error nicely whether it's a Taco Error or not
            var error: TacoError = reason && reason.isTacoError ? reason : errorHelper.wrap(TacoErrorCodes.CommandError, reason);
            logger.logError(error.toString());
            
            process.exit(1);
        });
    }

    /*
     * runs taco with passed array of args ensuring proper initialization
     */
    public static runWithArgs(args: string[]): Q.Promise<any> {
        return Q({})
            .then(function (): Q.Promise<any> {
                var parsedArgs: IParsedArgs = Taco.parseArgs(args);
                projectHelper.cdToProjectRoot();

                // if no command found that can handle these args, route args directly to Cordova
                if (parsedArgs.command) {
                    var commandData: tacoUtility.Commands.ICommandData = { options: {}, original: parsedArgs.args, remain: parsedArgs.args };
                    return parsedArgs.command.run(commandData);
                } else {
                    return cordovaWrapper.cli(parsedArgs.args);
                }
        });
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
        var command: commands.ICommand = commandsFactory.getTask(commandName, commandArgs, __dirname);

        return <IParsedArgs>{ command: command, args: command ? commandArgs : args };
    }
}

export = Taco;
