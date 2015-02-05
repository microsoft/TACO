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
    public run(): void {        
        console.log("Cordova!!!");
        //console.log("args:  " + this.info.args.length);
        //console.log("options:  " + this.info.options.length);
        console.log(this.cliArgs);
        cordova.cli(["cc", "dd"]);
    }
}

export = Cordova;