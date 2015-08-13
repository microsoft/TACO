/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../typings/node.d.ts" />

"use strict";

import commands = require ("./commands");
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
        public static telemetryProperty(propertyValue: any, pii?: boolean): ITelemetryPropertyInfo {
            return { value: String(propertyValue), isPii: pii || false };  
        }

        public static addTelemetryEventProperties(event: Telemetry.TelemetryEvent, properties: ICommandTelemetryProperties): void {
            if (!properties) {
                return;
            }
            
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
            if (packageLoader.TacoPackageLoader.GitUriRegex.test(targetString) || packageLoader.TacoPackageLoader.FileUriRegex.test(targetString)) {
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

        public static telemetryPiiProperty(value: any): ITelemetryPropertyInfo {
            return { value: value, isPii: true };
        }

        public static telemetryNonPiiProperty(value: any): ITelemetryPropertyInfo {
            return { value: value, isPii: false };
        }

        public static addPropertiesFromOptions(telemetryProperties: ICommandTelemetryProperties, knownOptions: Nopt.CommandData,
            commandData: commands.Commands.ICommandData, nonPiiOptions: string[] = []): ICommandTelemetryProperties {
            // We parse only the known options, to avoid potential private information that may appear on the command line
            var unknownOptionIndex = 1;
            Object.keys(commandData.options).forEach(key => {
                var value = commandData.options[key];
                if (Object.keys(knownOptions).indexOf(key) >= 0) {
                    // This is a known option. We'll check the list to decide if it's pii or not
                    if (typeof (value) !== "undefined") {
                        // We encrypt all options values unless they are specifically marked as nonPii
                        var serializingMethod = nonPiiOptions.indexOf(key) >= 0 ? this.telemetryNonPiiProperty : this.telemetryPiiProperty;
                        telemetryProperties["options." + key] = serializingMethod(value);
                    }
                } else {
                    // This is a not known option. We'll assume that both the option and the value are pii
                    telemetryProperties["unknown_option" + unknownOptionIndex + ".name"] = this.telemetryPiiProperty(key);
                    telemetryProperties["unknown_option" + unknownOptionIndex++ + ".value"] = this.telemetryPiiProperty(value);
                }
            });
            return telemetryProperties;
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
                event.setPiiProperty(propertyName, "" + propertyValue);
            } else {
                event.properties[propertyName] = "" + propertyValue;
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
