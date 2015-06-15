/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/argsHelper.d.ts" />
/// <reference path="../typings/resourceManager.d.ts" />
/// <reference path="../typings/buildInfo.d.ts" />
/// <reference path="../typings/cordovaConfig.d.ts" />
/// <reference path="../typings/utilHelper.d.ts" />
/// <reference path="../typings/logger.d.ts" />
/// <reference path="../typings/loggerHelper.d.ts" />
/// <reference path="../typings/commands.d.ts" />
/// <reference path="../typings/processLogger.d.ts" />
/// <reference path="../typings/tacoError.d.ts" />
/// <reference path="../typings/tacoUtilsErrorCodes.d.ts" />
/// <reference path="../typings/tacoPackageLoader.d.ts" />
/// <reference path="../typings/countStream.d.ts" />
/// <reference path="../typings/jsDocHelpPrinter.d.ts" />
/// <reference path="../typings/telemetry.d.ts" />

// To add more classes, make sure that they define themselves in the TacoUtility namespace,
// include a reference to the d.ts file that is generated (as above), and make sure
// to remove the "export =" and any imports in the file. If it refers to external types,
// ensure that it has a /// <reference> to the relevant file, and that it uses the same name
// that file does for the type's namespace. See utilHelper for how it uses Q

declare module "taco-utils" {
    export = TacoUtility;
}
