///<reference path="../../typings/taco-utils.d.ts"/>
///<reference path="../../typings/node.d.ts"/>
///<reference path="../../typings/nopt.d.ts"/>

import tacoUtility = require("taco-utils");
import nopt = require("nopt");
import path = require("path");


class Taco {
    constructor() {
        var resourcePath: string = path.resolve("../resources");
        tacoUtility.ResourcesManager.init("en", resourcePath);
    }
    run(): void {
        console.log(tacoUtility.ResourcesManager.getString("usage"));
    }
}


var taco = new Taco();
taco.run();