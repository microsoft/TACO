/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/nodeFakes.d.ts" />
/// <reference path="../typings/telemetryFakes.d.ts" />
/// <reference path="../typings/projectHelper.d.ts" />

// To add more classes, make sure that they define themselves in the TacoTestsUtils namespace,
// include a reference to the d.ts file that is generated (as above), and make sure
// to remove the "export =" and any imports in the file. If it refers to external types,
// ensure that it has a /// <reference> to the relevant file, and that it uses the same name
// that file does for the type's namespace. See utilHelper for how it uses Q

declare module "taco-tests-utils" {
    export = TacoTestsUtils;
}
