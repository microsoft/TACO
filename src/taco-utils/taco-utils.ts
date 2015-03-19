"use strict";
import buildInfo = require ("./build-info");
import cordovaConfig = require ("./cordova-config");
import resourcesManager = require ("./resources-manager");
import utilHelper = require ("./util-helper");
import commands = require ("./commands");
import logger = require("./logger");

module TacoUtility {
    // put more classes here, known limitation that classes in external modules CANNOT span multiple files    
    /// <disable code="SA1301" justification="We are exporting classes" />
    export var BuildInfo = buildInfo.BuildInfo;
    export var CordovaConfig = cordovaConfig.CordovaConfig;
    export var ResourcesManager = resourcesManager.ResourcesManager;
    export var UtilHelper = utilHelper.UtilHelper;
    export var Commands = commands.Commands;
    export var Logger = logger.Logger;
    /// <enable code="SA1301" />
}

export = TacoUtility;
