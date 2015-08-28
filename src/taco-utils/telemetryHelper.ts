/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../typings/commands.d.ts" />
/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/lodash.d.ts" />

"use strict";

import _ = require ("lodash");
import Q = require ("q");

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

    interface IDictionary<T> {
        [key: string]: T
    }

    export class TelemetryGenerator {
        private telemetryProperties: ICommandTelemetryProperties = {};
        private componentName: string;
        private currentStepStartTime: number[] = process.hrtime();
        private currentStep: string = "initialStep";
        private errorIndex: number = -1; // In case we have more than one error (We start at -1 because we increment it before using it)

        constructor(componentName: string) {
            this.componentName = componentName;
        }

        public add(baseName: string, value: any, isPii: boolean): TelemetryGenerator {
            return this.addWithPiiEvaluator(baseName, value, () => isPii);
        }

        public addWithPiiEvaluator(baseName: string, value: any, piiEvaluator: { (value: string): boolean }): TelemetryGenerator {
            // We have 3 cases:
            //     * Object is an array, we add each element as baseNameNNN
            //     * Object is a hash, we add each element as baseName.KEY
            //     * Object is a value, we add the element as baseName
            try {
                if (Array.isArray(value)) {
                    this.addArray(baseName, <any[]>value, piiEvaluator);
                } else if (_.isObject(value)) {
                    /// <disable code="SA1012" justification="We have two rules fighting each other in the next line" />
                    this.addHash(baseName, <IDictionary<any>>value, piiEvaluator);
                } else {
                    this.addString(baseName, String(value), piiEvaluator);
                }
            } catch (error) {
                // We don't want to crash the functionality if the telemetry fails.
                // This error message will be a javascript error message, so it's not pii
                this.addString("telemetryGenerationError." + baseName, String(error), () => false);
            }

            return this;
        }

        public addError(error: any): TelemetryGenerator {
            this.add("error.message" + ++this.errorIndex, error, /*isPii*/ true);
            if (error.errorCode) {
                this.add("error.code" + this.errorIndex, error.errorCode, /*isPii*/ false);
            }

            return this;
        }

        public time<T>(name: string, codeToMeasure: { (): T }): T {
            var startTime = process.hrtime();
            return executeAfter(codeToMeasure(),
                () => this.finishTime(name, startTime),
                (reason: any) => {
                    this.addError(reason);
                    return Q.reject(reason);
                });
        }

        public step(name: string): TelemetryGenerator {
            // First we finish measuring this step time, and we send a telemetry event for this step
            this.finishTime(this.currentStep, this.currentStepStartTime);
            this.sendCurrentStep();

            // Then we prepare to start gathering information about the next step
            this.currentStep = name;
            this.telemetryProperties = {};
            this.currentStepStartTime = process.hrtime();
            return this;
        }

        public send(): void {
            if (this.currentStep) {
                this.add("lastStepExecuted", this.currentStep, false);
            }

            this.step(null); // Send the last step
        }

        private sendCurrentStep(): void {
            this.add("step", this.currentStep, false);
            var telemetryEvent = new Telemetry.TelemetryEvent(Telemetry.appName + "/component/" + this.componentName);
            TelemetryHelper.addTelemetryEventProperties(telemetryEvent, this.telemetryProperties);
            Telemetry.send(telemetryEvent);
        }

        private addArray(baseName: string, array: any[], piiEvaluator: { (value: string): boolean }): void {
            // Object is an array, we add each element as baseNameNNN
            var elementIndex = 1; // We send telemetry properties in a one-based index
            array.forEach((element: any) => this.addWithPiiEvaluator(baseName + elementIndex++, element, piiEvaluator));
        }

        private addHash(baseName: string, hash: IDictionary<any>, piiEvaluator: { (value: string): boolean }): void {
            // Object is a hash, we add each element as baseName.KEY
            Object.keys(hash).forEach(key => this.addWithPiiEvaluator(baseName + "." + key, hash[key], piiEvaluator));
        }

        private addString(name: string, value: string, piiEvaluator: { (value: string): boolean }): void {
            this.telemetryProperties[name] = TelemetryHelper.telemetryProperty(value, piiEvaluator(value));
        }

        private combine(...components: string[]): string {
            var nonNullComponents = components.filter(component => !_.isNull(component));
            return nonNullComponents.join(".");
        }

        private finishTime(name: string, startTime: number[]): void {
            var endTime = process.hrtime(startTime);
            this.add(this.combine(name, "time"), String(endTime[0] * 1000 + endTime[1] / 1000000), /*isPii*/ false);
        }
    }

    /* 
    * Given an object that might be either a value or a promise, we'll execute a callback after the object gets "finished"
    *    In the case of a promise, that means on the .finally handler. In the case of a value, that means immediately.
    *    It also supports attaching a fail callback in case it's a promise
    */
    function executeAfter<T>(valueOrPromise: T, afterCallback: { (): void }, failCallback: { (reason: any): void } = (reason: any) => Q.reject(reason)): T {
        var valueAsPromise = <Q.Promise<any>><Object>valueOrPromise;
        if (_.isObject(valueAsPromise) && _.isFunction(valueAsPromise.finally)) {
            // valueOrPromise must be a promise. We'll add the callback as a finally handler
            return <T><Object>valueAsPromise.finally(afterCallback).fail(failCallback);
        } else {
            // valueOrPromise is just a value. We'll execute the callback now
            afterCallback();
            return valueOrPromise;
        }
    }

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

        public static addPropertiesFromOptions(telemetryProperties: ICommandTelemetryProperties, knownOptions: Nopt.CommandData,
            commandOptions: { [flag: string]: any }, nonPiiOptions: string[] = []): ICommandTelemetryProperties {
            // We parse only the known options, to avoid potential private information that may appear on the command line
            var unknownOptionIndex = 1;
            Object.keys(commandOptions).forEach(key => {
                var value = commandOptions[key];
                if (Object.keys(knownOptions).indexOf(key) >= 0) {
                    // This is a known option. We'll check the list to decide if it's pii or not
                    if (typeof (value) !== "undefined") {
                        // We encrypt all options values unless they are specifically marked as nonPii
                        telemetryProperties["options." + key] = this.telemetryProperty(value, nonPiiOptions.indexOf(key) < 0);
                    }
                } else {
                    // This is a not known option. We'll assume that both the option and the value are pii
                    telemetryProperties["unknownOption" + unknownOptionIndex + ".name"] = this.telemetryProperty(key, /*isPii*/ true);
                    telemetryProperties["unknownOption" + unknownOptionIndex++ + ".value"] = this.telemetryProperty(value, /*isPii*/ true);
                }
            });
            return telemetryProperties;
        }

        public static generate<T>(name: string, codeGeneratingTelemetry: { (telemetry: TelemetryGenerator): T }): T {
            var generator = new TelemetryGenerator(name);
            return executeAfter(generator.time(null, () => codeGeneratingTelemetry(generator)), () => generator.send());
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
                event.setPiiProperty(propertyName, String(propertyValue));
            } else {
                event.properties[propertyName] = String(propertyValue);
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
