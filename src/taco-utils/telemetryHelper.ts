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

    export interface ITelemetryPropertyInfo {
        value: any;
        isPii: boolean;
    };

    export interface ICommandTelemetryProperties {
        [propertyName: string]: ITelemetryPropertyInfo;
    };

    export class TelemetryHelper {
       public static sendBasicCommandTelemetry(commandName: string, args?: string[]): void {
            var commandEvent = new Telemetry.TelemetryEvent(Telemetry.appName + "/command");
            commandEvent.properties["command"] = commandName;

            if (args) {
                TelemetryHelper.addTelemetryEventProperty(commandEvent, "argument", args, true);
            }

            Telemetry.send(commandEvent);
        }

        public static addTelemetryEventProperty(event: Telemetry.TelemetryEvent, propertyName: string, propertyValue: any, isPii: boolean): void {
            if (Array.isArray(propertyValue)) {
                TelemetryHelper.addMultiValuedTelemetryEventProperty(event, propertyName, propertyValue, isPii);
            } else {
                TelemetryHelper.setTelemetryEventProperty(event, propertyName, propertyValue, isPii)
            }
        }

        public static addTelemetryEventProperties(event: Telemetry.TelemetryEvent, properties: ICommandTelemetryProperties): void {
            Object.keys(properties).forEach(function (propertyName: string): void {
                TelemetryHelper.addTelemetryEventProperty(event, propertyName, properties[propertyName].value, properties[propertyName].isPii);
            });
        }

        public static sendErrorTelemetry(error: any, commandName: string, args?: string[]): void {
            var erroEvent = new Telemetry.TelemetryEvent(Telemetry.appName + "/command");
            erroEvent.properties["command"] = commandName;

            if (args) {
                TelemetryHelper.addTelemetryEventProperty(erroEvent, "argument", args, true);
            }
            
            if (error.isTacoError) {
                erroEvent.properties["tacoErrorCode"] = error.errorCode;
            } else if (error.message) {
                erroEvent.setPiiProperty("error", error.message);
            } 
        }

        private static setTelemetryEventProperty(event: Telemetry.TelemetryEvent, propertyName: string, propertyValue: string, isPii: boolean): void {
            if (isPii) {
                event.setPiiProperty(propertyName, propertyValue);
            } else {
                event.properties[propertyName] = propertyValue;
            }       
        }

        private static addMultiValuedTelemetryEventProperty(event: Telemetry.TelemetryEvent, propertyName: string, propertyValue: string, isPii: boolean): void {
            for (var i = 0; i < propertyValue.length; i++) {
                TelemetryHelper.setTelemetryEventProperty(event, propertyName + i, propertyValue[i], isPii);
            }            
        }

        
    };
}

export = TacoUtility;
