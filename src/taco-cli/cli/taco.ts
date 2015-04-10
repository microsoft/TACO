/// <reference path="../../typings/taco-utils.d.ts" />
/// <reference path="../../typings/taco-kits.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/cordova-extensions.d.ts" />

import tacoUtility = require("taco-utils");
import tacoKits = require("taco-kits");
import resourcesManager = tacoUtility.ResourcesManager;
import commands = tacoUtility.Commands;
var kitHelper = tacoKits.KitHelper;
import commandsFactory = commands.CommandFactory;
import path = require ("path");
var cordova = require("cordova");
import kits = tacoKits.KitHelper;

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
        var resourcePath: string = path.resolve(__dirname, "..", "resources");
        resourcesManager.init("en", resourcePath);
        commandsFactory.init(path.join(__dirname, "../cli/commands.json"));
        kitHelper.init("en");
        // parse taco command
        var input: string = process.argv[2];
        var command: commands.ICommand = null;

        // get appropriate task
        if (!input) {
            input = "help";
        }                 

        var commandData: tacoUtility.Commands.ICommandData;
        if (input === "create") {
            commandData = {
                options: {},
                original: commandArgs,
                remain: commandArgs,
                raw: cordovaCliArgs
            };
        }
        else {
            commandData = {
                options: {},
                original: commandArgs,
                remain: commandArgs,
                raw: cordovaCliArgs
            };
        }
            

        var cordovaCliArgs = process.argv;
        var commandArgs = process.argv.slice(3);
        command = commandsFactory.getTask(input, commandArgs, __dirname);

        var commandData: tacoUtility.Commands.ICommandData = {
            options: {},
            original: commandArgs,
            remain: commandArgs,
            raw: cordovaCliArgs
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