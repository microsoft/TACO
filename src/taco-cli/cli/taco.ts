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
var cordova = require("cordova");

import resources = require ("../resources/resourceManager");
import tacoUtility = require ("taco-utils");
import tacoKits = require ("taco-kits");
import logger = tacoUtility.Logger;

import commands = tacoUtility.Commands;
import commandsFactory = commands.CommandFactory;
var kitHelper = tacoKits.KitHelper;

/*
 * Taco
 *
 * Main Taco class
 */
class Taco {
    /*
     * Initialize all other config classes, Invoke task to be run
     */
    public static run(): void {
        commandsFactory.init(path.join(__dirname, "../cli/commands.json"));
        // parse taco command
        var input: string = process.argv[2];
        var command: commands.ICommand = null;

        var args = process.argv.slice(2);
        var commandArgs = process.argv.slice(3);      

        // if version flag found, mark input as version and continue
        if (args.some(function (value: string): boolean { return /^(-+)(v|version)$/.test(value); })) {
            input = "version";
        } else {
            for (var i = 0; i < args.length; i++) {
                if (/^(-+)(h|help)$/.test(args[i])) {                     
                    if (i === 0) {
                        // for "taco --help cmd" scenarios, update commandArgs to reflect the next argument or make it [] if it is not present
                        commandArgs = args[1] ? [args[1]] : [];
                    } else {
                        // for "taco cmd --help" scenarios, update commandArgs to reflect the first argument instead
                        commandArgs = [args[0]];
                    }

                    input = "help";
                    break;
                }
            }
        }

        if (!input) {
            input = "help";
        }

        command = commandsFactory.getTask(input, commandArgs, __dirname);

        var commandData: tacoUtility.Commands.ICommandData = {
            options: {},
            original: commandArgs,
            remain: commandArgs
        };
       
        // if no command found that can handle these args, route args directly to Cordova
        if (command) {
            command.run(commandData).done(null, function (reason: any): any {
                if (reason && reason.isTacoError) {
                    tacoUtility.Logger.logErrorLine((<tacoUtility.TacoError>reason).toString());
                } else {
                    throw reason;
                }
            });
        } else {
            cordova.cli(args);
        }
    }
}

export = Taco;
