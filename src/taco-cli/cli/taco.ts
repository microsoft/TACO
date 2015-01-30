///<reference path="../../typings/taco-utility.d.ts"/>
///<reference path="../../typings/node.d.ts"/>
///<reference path="../../typings/nopt.d.ts"/>

import tacoUtility = require("taco-utility");
import nopt = require("nopt");
import path = require("path");


class Taco {
    tacoResources: tacoUtility.Resources;
    constructor() {
	var resourcePath : string = path.resolve("../resources");
        this.tacoResources = new tacoUtility.Resources("en", resourcePath);
    }
    run(): void {
        console.log(this.tacoResources.getString("usage"));
    }
}


var taco = new Taco();
taco.run();