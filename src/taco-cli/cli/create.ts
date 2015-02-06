/// <reference path="../../typings/taco-utils.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />

import tacoUtility = require("taco-utils");
import cordovaCommand = require("./cordova");
var nopt = require("nopt");
import logger = tacoUtility.Logger;
import level = logger.Level;

/*
 * Create
 *
 * handles "Taco Create"
 */
class Create extends cordovaCommand {
    run() {
        console.log("create!!!");
        var knownOpts: any = {
            "template": String
        };
        var shortHands: any = {
            "t": ["--template"]
        };

        var args = nopt(knownOpts, shortHands, process.argv, 2);

        //sample getting args specific to taco
        logger.logNewLine("Creating new project using template : " + args.template, level.Success);

        //sample routing remaining args to Cordova
        this.cliArgs = args.argv.remain;
        super.run();
    }
}

export = Create;