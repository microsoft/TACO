/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../typings/node.d.ts" />

"use strict";

import packageLoader = require ("./tacoPackageLoader");
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
        public static telemetryProperty(propertyValue: any, isPii: boolean): ITelemetryPropertyInfo {
            return { value: String(propertyValue), isPii: isPii };  
        }

        public static addTelemetryEventProperties(event: Telemetry.TelemetryEvent, properties: ICommandTelemetryProperties): void {
            Object.keys(properties).forEach(function (propertyName: string): void {
                TelemetryHelper.addTelemetryEventProperty(event, propertyName, properties[propertyName].value, properties[propertyName].isPii);
            });
        }

        public static sendCommandFailureTelemetry(commandName: string, error: any, projectProperties: ICommandTelemetryProperties, args: string[] = null): void { 
            var errorEvent = TelemetryHelper.createBasicCommandTelemetry(commandName, args);
            
            if (error.isTacoError) {
                errorEvent.properties["tacoErrorCode"] = error.errorCode;
            } else if (error.message) {
                errorEvent.setPiiProperty("errorMessage", error.message);
            }

            TelemetryHelper.addTelemetryEventProperties(errorEvent, projectProperties);

            Telemetry.send(errorEvent);
        }

        public static sendCommandSuccessTelemetry(commandName: string, commandProperties: ICommandTelemetryProperties, args: string[] = null): void {
            var successEvent = TelemetryHelper.createBasicCommandTelemetry(commandName, args);
            
            TelemetryHelper.addTelemetryEventProperties(successEvent, commandProperties);

            Telemetry.send(successEvent);
        }

        public static sanitizeTargetStringPropertyInfo(targetString: string): ITelemetryPropertyInfo {
            var propertyInfo = { value: targetString, isPii: false };
            if (packageLoader.TacoPackageLoader.GitUriRegex.test(targetString)) {
                propertyInfo.isPii = true;
            } else if (packageLoader.TacoPackageLoader.FileUriRegex.test(targetString)) {
                propertyInfo.isPii = true;
            } else {
                propertyInfo.value = targetString;
            }

            return propertyInfo;
        }

        public static addTelemetryEventProperty(event: Telemetry.TelemetryEvent, propertyName: string, propertyValue: any, isPii: boolean): void {
            if (Array.isArray(propertyValue)) {
                TelemetryHelper.addMultiValuedTelemetryEventProperty(event, propertyName, propertyValue, isPii);
            } else {
                TelemetryHelper.setTelemetryEventProperty(event, propertyName, propertyValue, isPii);
            }
        }

        private static createBasicCommandTelemetry(commandName: string, args: string[] = null): Telemetry.TelemetryEvent {
            var commandEvent = new Telemetry.TelemetryEvent(Telemetry.appName + "/command");
            
            if (commandName) {
                commandEvent.properties["command"] = commandName;
            } else if (args && args.length > 0) {
                commandEvent.setPiiProperty("command", args[0]);
            }

            if (args) {
                TelemetryHelper.addTelemetryEventProperty(commandEvent, "argument", args, true);
            }

            return commandEvent;
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
