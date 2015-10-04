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
    /* tslint:disable:variable-name */
    // We mostly export classes here from taco-utils and we prefer keeping them pascal cased
    // put more classes here, known limitation that classes in external modules CANNOT span multiple files    
    export var ArgsHelper: any = argsHelper.ArgsHelper;
    export var BuildInfo: any = buildInfo.BuildInfo;
    export var Commands: any = commands.Commands;
    export var CordovaConfig: any = cordovaConfig.CordovaConfig;
    export var CountStream: any = countStream.CountStream;
    export var Logger: any = logger.Logger;
    export var LoggerHelper: any = loggerHelper.LoggerHelper;
    export var LogLevel: any = logLevel.LogLevel;
    export var NewlineNormalizerStream: any = newlineNormalizerStream.NewlineNormalizerStream;
    export var HelpCommandBase: any = helpCommandBase.HelpCommandBase;
    export var InstallLogLevel: any = installLogLevel.InstallLogLevel;
    export var JsonSerializer: any = jsonSerializer.JsonSerializer;
    export var ProcessLogger: any = processLogger.ProcessLogger;
    export var ResourceManager: any = resourceManager.ResourceManager;
    export var TacoError: any = tacoError.TacoError;
    export var TacoErrorCode: any = tacoErrorCodes.TacoErrorCode;
    export var TacoGlobalConfig: any = tacoGlobalConfig.TacoGlobalConfig;
    export var TacoPackageLoader: any = tacoPackageLoader.TacoPackageLoader;
    export var TelemetryGenerator: any = telemetryHelper.TelemetryGenerator;
    export var Telemetry: any = telemetry.Telemetry;
    export var TelemetryHelper: any = telemetryHelper.TelemetryHelper;
    export var UtilHelper: any = utilHelper.UtilHelper;
    export var LogFormatHelper: any = logFormatHelper.LogFormatHelper;
    /* tslint:enable:variable-name */
}

export = TacoUtility;
