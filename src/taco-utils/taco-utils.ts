/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/elementtree.d.ts"/>
/// <reference path="../typings/unorm.d.ts"/>
"use strict";
import buildInfo = require("./build-info");
import cordovaConfig = require("./cordova-config");
import resourcesManager = require("./resources-manager");
import utilHelper = require("./util-helper");

module TacoUtility {
    // put more classes here, known limitation that classes in external modules CANNOT span multiple files    
    export var BuildInfo = buildInfo.BuildInfo;
	export var CordovaConfig = cordovaConfig.CordovaConfig;
	export var ResourcesManager = resourcesManager.ResourcesManager;
	export var UtilHelper = utilHelper.UtilHelper;
}

export = TacoUtility;