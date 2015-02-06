/// <reference path="../../typings/taco-utils.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/cordova.d.ts" />

import tacoUtility = require("taco-utils");
import resourcesManager = tacoUtility.ResourcesManager;
import commandsFactory = tacoUtility.Commands.CommandFactory;
import fs = require("fs");
import path = require("path");

class Taco {
    constructor() {
        var resourcePath: string = path.resolve("../resources");
        resourcesManager.init("en", resourcePath);
        commandsFactory.init("../cli/commands.json");
    }

    public run(): void {
        commandsFactory.runTask();
    }
}

function start(): void {
    var taco = new Taco();
    taco.run();
}

export = start;