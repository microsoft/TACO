/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

"use strict";
import buildInfo = require ("./buildInfo");
import commands = require ("./commands");
import cordovaConfig = require ("./cordovaConfig");
import countStream = require ("./countStream");
import resourceManager = require ("./resourceManager");
import jsDocHelpPrinter = require ("./jsDocHelpPrinter");
import logger = require ("./logger");
import processLogger = require ("./processLogger");
import tacoError = require ("./tacoError");
import tacoPackageLoader = require ("./tacoPackageLoader");
import utilHelper = require ("./utilHelper");

module TacoUtility {
    // put more classes here, known limitation that classes in external modules CANNOT span multiple files    
    /// <disable code="SA1301" justification="We are exporting classes" />
    export var BuildInfo = buildInfo.BuildInfo;
    export var Commands = commands.Commands;
    export var CordovaConfig = cordovaConfig.CordovaConfig;
    export var CountStream = countStream.CountStream;
    export var JSDocHelpPrinter = jsDocHelpPrinter.JSDocHelpPrinter;
    export var Logger = logger.Logger;
    export var ProcessLogger = processLogger.ProcessLogger;
    export var ResourceManager = resourceManager.ResourceManager;
    export var TacoError = tacoError.TacoError;
    export var TacoPackageLoader = tacoPackageLoader.TacoPackageLoader;
    export var UtilHelper = utilHelper.UtilHelper;
    /// <enable code="SA1301" />
}

export = TacoUtility;
