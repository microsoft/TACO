/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/tacoUtils.d.ts" />

"use strict";
import Q = require ("q");
import tacoUtility = require ("taco-utils");

import commands = tacoUtility.Commands;
import telemetry = tacoUtility.Telemetry;

/**
 * feedback
 *
 * handles "taco feedback"
 */
class Feedback extends commands.TacoCommandBase {
    public info: commands.ICommandInfo;

    public name: string = "feedback";
   
    public canHandleArgs(data: commands.ICommandData): boolean {
        return true;
    }

    /**
     * Prompt for telemetry consent
     */
    public run(data: commands.ICommandData): Q.Promise<any> {
        telemetry.changeTelemetryOptInSetting();
        return Q({});
    }
}

export = Feedback;