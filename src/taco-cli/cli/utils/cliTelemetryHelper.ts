// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/// <reference path="../../../typings/tacoUtils.d.ts" />
/// <reference path="../../../typings/Q.d.ts" />
/// <reference path="../../../typings/telemetryHelper.d.ts" />
"use strict";

import tacoUtility = require ("taco-utils");

import ProjectHelper = tacoUtility.ProjectHelper;

class CliTelemetryHelper {
    public static getCurrentProjectTelemetryProperties(): Q.Promise<TacoUtility.ICommandTelemetryProperties> {
        var cliVersion: string = require("../../package.json").version;
        return ProjectHelper.getCurrentProjectTelemetryProperties(cliVersion);
    }
}

export = CliTelemetryHelper;
