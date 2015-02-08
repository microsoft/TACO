/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/elementtree.d.ts"/>
/// <reference path="../typings/unorm.d.ts"/>
"use strict";

import et = require ("elementtree");
import fs = require ("fs");
import path = require ("path");
var unorm = require("unorm"); // Note no import: the compiler will remove the require since we don't use the unorm object, we just need it to add String.normalize

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