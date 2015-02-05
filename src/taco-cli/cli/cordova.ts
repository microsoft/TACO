/// <reference path="../../typings/taco-utils.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/cordova.d.ts" />

import cordova = require("cordova");
import tacoUtility = require("taco-utils");

/**
* dfdf
*/
class Cordova extends tacoUtility.Commands.Command {
    run() {
        console.log("Cordova!!!");
        console.log("args:  " + this.info.args.length);
        console.log("options:  " + this.info.args.length);
        cordova.cli(["cc", "dd"]);
    }
}

export = Cordova;