/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../../typings/node.d.ts" />

"use strict";

import tacoUtility = require ("taco-utils");

import telemetry = tacoUtility.Telemetry;

class TelemetryHelper {
    public static sendBasicCommandTelemetry(commandName: string, args?: string): void {
        var commandEvent = new telemetry.TelemetryEvent("taco/command");
        commandEvent.properties["command"] = commandName;

        if (arguments) {
            commandEvent.properties["arguments"] = args;
        }

        telemetry.send(commandEvent);
    }
}

export = TelemetryHelper;