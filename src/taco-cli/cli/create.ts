/// <reference path="../../typings/taco-utils.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />

import tacoUtility = require("taco-utils");
import cordovaCommand = require("./cordova");
import commands = tacoUtility.Commands;
import logger = tacoUtility.Logger;
import level = logger.Level;
var nopt = require("nopt");

/*
 * Create
 *
 * handles "Taco Create"
 */
class Create implements commands.ICommand {
    public info: commands.ICommandInfo;
    /**
     * Sample only, shows processing specific taco commands, and passing remaining ones to Cordova CLI
     */  
    public run(args: string[]): void {
        var knownOpts: any = {
            "template": String
        };
        var shortHands: any = {
            "t": ["--template"]
        };

        var createArgs = nopt(knownOpts, shortHands, args, 2);

        //sample getting args specific to taco
        logger.logLine("Creating new project using template : " + createArgs.template, level.Success);

        //sample routing remaining args to Cordova, stripped out template
        //this.cliArgs = args.argv.remain;
        //super.run();  //take this out if we don't need to route to Cordova CLI
    }

    public canHandleArgs(args: string[]): boolean {
        return true;
    }
}

export = Create;