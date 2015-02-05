/// <reference path="../../typings/taco-utils.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />
/// <reference path="../../typings/cordova.d.ts" />

import tacoUtility = require("taco-utils");
import nopt = require("nopt");
import fs = require("fs");
import path = require("path");

class Taco {
    constructor() {
        var resourcePath: string = path.resolve("../resources");
        tacoUtility.ResourcesManager.init("en", resourcePath);        
    }

    public run(): void {
        tacoUtility.Commands.CommandFactory.init("./commands.json");
        tacoUtility.Commands.CommandFactory.getTask("info").run();
    }
}

//class CommandFactory {
//    private static Listings: any;
//    private static Instance: commands.Command;

//    // initialize with json file containing commands
//    public static init(commandsInfoPath: string) {
//        if (!fs.existsSync(commandsInfoPath)) {
//            throw new Error("Cannot find commands listing file");
//        }

//        CommandFactory.Listings = require(commandsInfoPath);        
//    }

//    // get specific task object, given task name
//    public static getTask(name: string): commands.Command {
//        if (!name || !CommandFactory.Listings) {
//            throw new Error("Cannot find command listing file");
//        }

//        if (CommandFactory.Instance) {
//            return CommandFactory.Instance;
//        }

//        var moduleInfo: commands.CommandInfo = CommandFactory.Listings[name];
//        var modulePath: string = moduleInfo.modulePath;
//        if (!fs.existsSync(modulePath + ".js")) {
//            throw new Error("Cannot find command module");
//        }

//        var commandMod: typeof commands.Command = require(modulePath);
//        CommandFactory.Instance = new commandMod(moduleInfo);
//        if (!CommandFactory.Instance) {
//            throw new Error("Can't build command instance");
//        }  
        
//        CommandFactory.Instance.run();
//    }
//}

var taco = new Taco();
taco.run();