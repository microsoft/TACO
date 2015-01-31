///<reference path="../../typings/taco-utils.d.ts"/>
///<reference path="../../typings/node.d.ts"/>
///<reference path="../../typings/nopt.d.ts"/>

import tacoUtility = require("taco-utils");
import nopt = require("nopt");
import path = require("path");


class Taco {
    resources: tacoUtility.ResourcesManager;
    constructor() {
        var resourcePath: string = path.resolve("../resources");
        this.resources = tacoUtility.ResourcesManager.getInstance();
        this.resources.init("en", resourcePath);
    }
    run(): void {
        console.log(this.resources.getString("usage"));
    }
}


var taco = new Taco();
taco.run();