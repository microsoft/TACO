/// <reference path="../../typings/taco-utils.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/cordova.d.ts" />

import cordova = require ("cordova");
import tacoUtility = require("taco-utils");
import commands = tacoUtility.Commands;
/*
 * Cordova
 *
 * Command class handling passthroughs to CordovaCLI
 */
class Cordova implements commands.ICommand {
    info: commands.ICommandInfo;
    /**
     * Handles direct routing to Cordova CLI
     */  
    public run(args: string[]): void {        
        cordova.cli(args);  
    }

    public canHandleArgs(args: string[]): boolean {
        return true;
    }
}

export = Cordova;