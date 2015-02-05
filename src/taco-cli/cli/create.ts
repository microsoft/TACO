/// <reference path="../../typings/taco-utils.d.ts" />
/// <reference path="../../typings/node.d.ts" />

import tacoUtility = require("taco-utils");
import cordovaCommand = require("./cordova");

/*
 * Create
 *
 * handles "Taco Create"
 */
class Create extends cordovaCommand {
    run() {
        console.log("create!!!");
    }
}

export = Create;