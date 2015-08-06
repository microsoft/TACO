/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../typings/node.d.ts" />

"use strict";

import telemetry = require ("./telemetry");

import Telemetry = telemetry.Telemetry;

module TacoUtility {
    export class TelemetryHelper {
        public static sendBasicCommandTelemetry(commandName: string, args?: string[]): void {
            var commandEvent = new Telemetry.TelemetryEvent(Telemetry.appName + "/command");
            commandEvent.properties["command"] = commandName;

            if (args) {
                TelemetryHelper.addMultiplePropertiesToEvent(commandEvent, "argument", args, true);
            }

            Telemetry.send(commandEvent);
        }

        public static addMultiplePropertiesToEvent(event: Telemetry.TelemetryEvent, basePropertyName: string, values: string[], isPii: boolean = false): void {
            for (var i = 0; i < values.length; i++) {
                if (isPii) {
                    event.setPiiProperty(basePropertyName + i, values[i]);
                } else {
                    event.properties[basePropertyName + i] = values[i];
                }
            }            
        }
    };
}

export = TacoUtility;
