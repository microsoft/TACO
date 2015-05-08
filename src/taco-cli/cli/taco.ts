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

        // get appropriate task
        if (!input) {
            input = "help";
        }                 

        var cordovaCliArgs = process.argv;
        var commandArgs = process.argv.slice(3);
        command = commandsFactory.getTask(input, commandArgs, __dirname);

        var commandData: tacoUtility.Commands.ICommandData = {
            options: {},
            original: commandArgs,
            remain: commandArgs
        };

        // if no command found that can handle these args, route args directly to Cordova
        if (command) {
            command.run(commandData).done();
        } else {
            cordova.cli(cordovaCliArgs);
        }
    }
}

export = Taco;
