/// <reference path="../../typings/taco-utils.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/cordova.d.ts" />
/// <reference path="../../typings/cordova.d.ts" />

import tacoUtility = require("taco-utils");
import resourcesManager = tacoUtility.ResourcesManager;
import commands = tacoUtility.Commands;
import commandsFactory = commands.CommandFactory;
import path = require("path");
var cordova = require("cordova");
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
        var resourcePath: string = path.resolve("../resources");
        resourcesManager.init("en", resourcePath);
        commandsFactory.init("../cli/commands.json");
        
        // parse taco command
        var input: string = process.argv[2];
        var command: commands.ICommand = null;

        // get appropriate task
        if (input) {
            command = commandsFactory.getTask(input, process.argv);
        } else {
            command = commandsFactory.getTask("help", process.argv);
        }          
        
        // if no command found that can handle these args, route args directly to Cordova
        if (!command) {
            cordova.cli(process.argv);
            return;
        }

        command.run(process.argv);
    }
}

export = Taco;