/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

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
