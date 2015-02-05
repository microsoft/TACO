/// <reference path="../../typings/taco-utils.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />
/// <reference path="../../typings/cordova.d.ts" />

import tacoUtility = require("taco-utils");
import nopt = require("nopt");
import fs = require("fs");
import path = require("path");
import cordova = require("cordova");
import commands = require("./command");

class Taco {
    constructor() {
        var resourcePath: string = path.resolve("../resources");
        tacoUtility.ResourcesManager.init("en", resourcePath);

    }

    public run(): void {
        CommandFactory.init("./commands.json");
        CommandFactory.getTask("create");
        //console.log(tacoUtility.ResourcesManager.getString("usage"));
        //cordova.cli(["a", "b"]);
        //var commandListings = require("./commands.json");
        //console.log(commandListings["help"]["module"]);
        
        //if (process.argv[2]) {
        //    console.log("found");
        //    console.log("argv[2]: " + process.argv[2]);
        //} else {
        //    console.log("not found");
        //}
    }
}

class CommandFactory {
    private static Listings: any;
    private static Instance: commands.Command;

    //private static info: commands.CommandInfo;
    public static init(commandsInfoPath: string) {
        if (!fs.existsSync(commandsInfoPath)) {
            throw new Error("Cannot find commands listing file");
        }

        CommandFactory.Listings = require(commandsInfoPath);
        var modulePath: string = CommandFactory.Listings["create"]["modulePath"];
        console.log("modulePath:  " + modulePath);
    }

    public static getTask(name: string): commands.Command {
        if (!name || !CommandFactory.Listings) {
            throw new Error("Cannot find command listing");
        }

        if (CommandFactory.Instance) {
            return CommandFactory.Instance;
        }

        var modulePath: string = CommandFactory.Listings[name]["modulePath"];
        console.log(modulePath);
        //if (!fs.existsSync(modulePath)) {
        //    throw new Error("Cannot find command module:  " + modulePath);
        //}

        //var commandMod: typeof commands.Command = require(modulePath);      
        //CommandFactory.Instance = new commandMod();
        //if (!CommandFactory.Instance) {
        //    throw new Error("Can't build command instance");
        //}  
        
        //CommandFactory.Instance.run();
    }
}

var taco = new Taco();
taco.run();