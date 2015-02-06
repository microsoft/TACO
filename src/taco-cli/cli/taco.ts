/// <reference path="../../typings/taco-utils.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/cordova.d.ts" />

import tacoUtility = require("taco-utils");
import resourcesManager = tacoUtility.ResourcesManager;
import commandsFactory = tacoUtility.Commands.CommandFactory;
import fs = require("fs");
import path = require("path");

/*
 * Taco
 *
 * Main Taco class
 */
class Taco {
    /**
     * @constructor, initialize all other config classes
     */
    constructor() {
        var resourcePath: string = path.resolve("../resources");
        resourcesManager.init("en", resourcePath);
        commandsFactory.init("../cli/commands.json");
    }

    /*
     * Invoke task to be run
     */
    public run(): void {
        commandsFactory.runTask();
    }
}

/*
 * Entry point function called from node
 */
function start(): void {
    var taco = new Taco();
    taco.run();
}

export = start;