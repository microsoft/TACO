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
import cordovaHelper = require ("./cordovaHelper");
import cordovaWrapper = require ("./cordovaWrapper");
import countStream = require ("./countStream");
import resourceManager = require ("./resourceManager");
import helpCommandBase = require ("./helpCommandBase");
import installLogLevel = require ("./installLogLevel");
import jsonSerializer = require ("./jsonSerializer");
import logger = require ("./logger");
import loggerHelper = require ("./loggerHelper");
import logLevel = require ("./logLevel");
import newlineNormalizerStream = require ("./newlineNormalizerStream");
import projectHelper = require ("./projectHelper");
import processLogger = require ("./processLogger");
import promisesUtils = require ("./promisesUtils");
import tacoError = require ("./tacoError");
import tacoErrorCodes = require ("./tacoErrorCodes");
import tacoGlobalConfig = require ("./tacoGlobalConfig");
import tacoPackageLoader = require ("./tacoPackageLoader");
import telemetry = require ("./telemetry");
import telemetryHelper = require ("./telemetryHelper");
import utilHelper = require ("./utilHelper");
import logFormatHelper = require("./logFormatHelper");
import processUtils = require("./processUtils");

module TacoUtility {
    /* tslint:disable:variable-name */
    // We mostly export classes here from taco-utils and we prefer keeping them pascal cased
    // put more classes here, known limitation that classes in external modules CANNOT span multiple files    
    export var ArgsHelper: typeof argsHelper.ArgsHelper = argsHelper.ArgsHelper;
    export var BuildInfo: typeof buildInfo.BuildInfo = buildInfo.BuildInfo;
    export var Commands: typeof commands.Commands = commands.Commands;
    export var CordovaConfig: typeof cordovaConfig.CordovaConfig = cordovaConfig.CordovaConfig;
    export var CordovaHelper: typeof cordovaHelper.CordovaHelper = cordovaHelper.CordovaHelper;
    export var CordovaWrapper: typeof cordovaWrapper.CordovaWrapper = cordovaWrapper.CordovaWrapper;
    export var CountStream: typeof countStream.CountStream = countStream.CountStream;
    export var Logger: typeof logger.Logger = logger.Logger;
    export var LoggerHelper: typeof loggerHelper.LoggerHelper = loggerHelper.LoggerHelper;
    export var LogLevel: typeof logLevel.LogLevel = logLevel.LogLevel;
    export var NewlineNormalizerStream: typeof newlineNormalizerStream.NewlineNormalizerStream = newlineNormalizerStream.NewlineNormalizerStream;
    export var HelpCommandBase: typeof helpCommandBase.HelpCommandBase = helpCommandBase.HelpCommandBase;
    export var InstallLogLevel: typeof installLogLevel.InstallLogLevel = installLogLevel.InstallLogLevel;
    export var JsonSerializer: typeof jsonSerializer.JsonSerializer = jsonSerializer.JsonSerializer;
    export var ProcessLogger: typeof processLogger.ProcessLogger = processLogger.ProcessLogger;
    export var ProjectHelper: typeof projectHelper.ProjectHelper = projectHelper.ProjectHelper;
    export var ResourceManager: typeof resourceManager.ResourceManager = resourceManager.ResourceManager;
    export var TacoError: typeof tacoError.TacoError = tacoError.TacoError;
    export var TacoErrorLevel: typeof tacoError.TacoErrorLevel = tacoError.TacoErrorLevel;
    export var TacoErrorCode: typeof tacoErrorCodes.TacoErrorCode = tacoErrorCodes.TacoErrorCode;
    export var TacoGlobalConfig: typeof tacoGlobalConfig.TacoGlobalConfig = tacoGlobalConfig.TacoGlobalConfig;
    export var TacoPackageLoader: typeof tacoPackageLoader.TacoPackageLoader = tacoPackageLoader.TacoPackageLoader;
    export var TelemetryGenerator: typeof telemetryHelper.TelemetryGenerator = telemetryHelper.TelemetryGenerator;
    export var TelemetryGeneratorBase: typeof telemetryHelper.TelemetryGeneratorBase = telemetryHelper.TelemetryGeneratorBase;
    export var Telemetry: typeof telemetry.Telemetry = telemetry.Telemetry;
    export var TelemetryHelper: typeof telemetryHelper.TelemetryHelper = telemetryHelper.TelemetryHelper;
    export var UtilHelper: typeof utilHelper.UtilHelper = utilHelper.UtilHelper;
    export var LogFormatHelper: typeof logFormatHelper.LogFormatHelper = logFormatHelper.LogFormatHelper;
    export var PromisesUtils: typeof promisesUtils.PromisesUtils = promisesUtils.PromisesUtils;
    export var ProcessUtils: typeof processUtils.ProcessUtils = processUtils.ProcessUtils;
    /* tslint:enable:variable-name */
}

export = TacoUtility;
