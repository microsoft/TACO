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
    /**
     * Sample only, shows processing specific taco commands, and passing remaining ones to Cordova CLI
     */  
    run() {
        var knownOpts: any = {
            "template": String
        };
        var shortHands: any = {
            "t": ["--template"]
        };

        var args = nopt(knownOpts, shortHands, process.argv, 2);

        //sample getting args specific to taco
        logger.logNewLine("Creating new project using template : " + args.template, level.Success);

        //sample routing remaining args to Cordova, stripped out template
        this.cliArgs = args.argv.remain;
        super.run();  //take this out if we don't need to route to Cordova CLI
    }
}

export = Create;