/// <reference path="../../typings/taco-utils.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/cordova.d.ts" />

import cordova = require ("cordova");
import tacoUtility = require("taco-utils");
/*
 * Cordova
 *
 * Command class handling passthroughs to CordovaCLI
 */
class Cordova extends tacoUtility.Commands.Command {  
    
    /**
     * Handles direct routing to Cordova CLI
     */  
    public run(): void {        
        cordova.cli(this.cliArgs);  
    }
}

export = Cordova;