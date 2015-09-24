/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

"use strict";
import argsHelper = require ("./argsHelper");
import buildInfo = require ("./buildInfo");
import commands = require ("./commands");
import cordovaConfig = require ("./cordovaConfig");
import countStream = require ("./countStream");
import resourceManager = require ("./resourceManager");
import helpCommandBase = require ("./helpCommandBase");
import installLogLevel = require ("./installLogLevel");
import jsonSerializer = require ("./jsonSerializer");
import logger = require ("./logger");
import loggerHelper = require ("./loggerHelper");
import logLevel = require ("./logLevel");
import newlineNormalizerStream = require ("./newlineNormalizerStream");
import processLogger = require ("./processLogger");
import tacoError = require ("./tacoError");
import tacoErrorCodes = require ("./tacoErrorCodes");
import tacoGlobalConfig = require ("./tacoGlobalConfig");
import tacoPackageLoader = require ("./tacoPackageLoader");
import telemetry = require ("./telemetry");
import telemetryHelper = require ("./telemetryHelper");
import utilHelper = require ("./utilHelper");
import logFormatHelper = require ("./logFormatHelper");

module TacoUtility {
    // put more classes here, known limitation that classes in external modules CANNOT span multiple files    
    export var ArgsHelper = argsHelper.ArgsHelper;
    export var BuildInfo = buildInfo.BuildInfo;
    export var Commands = commands.Commands;
    export var CordovaConfig = cordovaConfig.CordovaConfig;
    export var CountStream = countStream.CountStream;
    export var Logger = logger.Logger;
    export var LoggerHelper = loggerHelper.LoggerHelper;
    export var LogLevel = logLevel.LogLevel;
    export var NewlineNormalizerStream = newlineNormalizerStream.NewlineNormalizerStream;
    export var HelpCommandBase = helpCommandBase.HelpCommandBase;
    export var InstallLogLevel = installLogLevel.InstallLogLevel;
    export var JsonSerializer = jsonSerializer.JsonSerializer;
    export var ProcessLogger = processLogger.ProcessLogger;
    export var ResourceManager = resourceManager.ResourceManager;
    export var TacoError = tacoError.TacoError;
    export var TacoErrorCode = tacoErrorCodes.TacoErrorCode;
    export var TacoGlobalConfig = tacoGlobalConfig.TacoGlobalConfig;
    export var TacoPackageLoader = tacoPackageLoader.TacoPackageLoader;
    export var TelemetryGenerator = telemetryHelper.TelemetryGenerator;
    export var Telemetry = telemetry.Telemetry;
    export var TelemetryHelper = telemetryHelper.TelemetryHelper;
    export var UtilHelper = utilHelper.UtilHelper;
    export var LogFormatHelper = logFormatHelper.LogFormatHelper;
}

export = TacoUtility;
