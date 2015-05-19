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
/// <reference path="../../typings/cordovaExtensions.d.ts" />

"use strict";

import path = require ("path");
import Q = require ("q");

import cordovaWrapper = require ("./utils/cordovaWrapper");
import resources = require ("../resources/resourceManager");
import tacoUtility = require ("taco-utils");
import tacoKits = require ("taco-kits");
import logger = tacoUtility.Logger;

import commands = tacoUtility.Commands;
import CommandsFactory = commands.CommandFactory;
var kitHelper = tacoKits.KitHelper;

interface IParsedArgs {
    args: string[];
    command: commands.ICommand;
}

/*
 * Taco
 *
 * Main Taco class
 */
class Taco { /*
     * Initialize all other config classes, Invoke task to be run
     */
    public static run(): void {
        var parsedArgs: IParsedArgs = Taco.parseArgs(process.argv.slice(2));
        var runPromise: Q.Promise<any> = null;

        // if no command found that can handle these args, route args directly to Cordova
        if (parsedArgs.command) {
            var commandData: tacoUtility.Commands.ICommandData = { options: {}, original: parsedArgs.args, remain: parsedArgs.args };
            runPromise = parsedArgs.command.run(commandData);
        } else {
            runPromise = cordovaWrapper.cli(parsedArgs.args);
        }

        runPromise.done(null, function (reason: any): any {
            // Pretty print taco Errors
            if (reason && reason.isTacoError) {
                tacoUtility.Logger.logErrorLine((<tacoUtility.TacoError>reason).toString());
            } else {
                throw reason;
            }
        });
    }

    private static parseArgs(args: string[]): IParsedArgs {
        var commandName: string = null;
        var commandArgs: string[] = null;

        // if version flag found, mark input as version and continue
        if (args.some(function (value: string): boolean { return /^(-+)(v|version)$/.test(value); })) {
            commandName = "version";
            commandArgs = [];
        } else {
            // if help flag is specified, use that
            // for "taco --help cmd" scenarios, update commandArgs to reflect the next argument or make it [] if it is not present
            // for "taco cmd --help" scenarios, update commandArgs to reflect the first argument instead
            for (var i = 0; i < args.length; i++) {
                if (/^(-+)(h|help)$/.test(args[i])) {
                    commandName = "help";
                    commandArgs = (i === 0) ? (args[1] ? [args[1]] : []) : [args[0]];
                    break;
                }
            }
        }

        commandName = commandName || args[0] || "help";
        commandArgs = commandArgs || args.slice(1);

        var commandsFactory: CommandsFactory = new CommandsFactory(path.join(__dirname, "./commands.json"));
        var command: commands.ICommand = commandsFactory.getTask(commandName, commandArgs, __dirname);
        var parsedArgs: IParsedArgs = {
            command: command,
            args: command ? commandArgs : args
        };
        return parsedArgs;
    }
}

export = Taco;
