"use strict";
import buildInfo = require ("./buildInfo");
import cordovaConfig = require ("./cordovaConfig");
import countStream = require ("./countStream");
import resourceManager = require ("./resourceManager");
import utilHelper = require ("./utilHelper");
import commands = require ("./commands");
import logger = require ("./logger");
import processLogger = require ("./processLogger");
import tacoPackageLoader = require ("./tacoPackageLoader");

module TacoUtility {
    // put more classes here, known limitation that classes in external modules CANNOT span multiple files    
    /// <disable code="SA1301" justification="We are exporting classes" />
    export var BuildInfo = buildInfo.BuildInfo;
    export var CordovaConfig = cordovaConfig.CordovaConfig;
    export var ResourceManager = resourceManager.ResourceManager;
    export var UtilHelper = utilHelper.UtilHelper;
    export var Commands = commands.Commands;
    export var Logger = logger.Logger;
    export var ProcessLogger = processLogger.ProcessLogger;
    export var TacoPackageLoader = tacoPackageLoader.TacoPackageLoader;
    export var CountStream = countStream.CountStream;
    /// <enable code="SA1301" />
}

export = TacoUtility;
