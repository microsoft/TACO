/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/commands.d.ts" />

declare module TacoUtility {
    interface ITelemetryPropertyInfo {
        value: any;
        isPii: boolean;
    }

    interface ICommandTelemetryProperties {
        [propertyName: string]: ITelemetryPropertyInfo;
    }

    class TelemetryGenerator {
        public constructor(componentName: string);
        public time<T>(name: string, codeToMeasure: { (): Q.Promise<T> }): Q.Promise<T>;
        public step(name: string): TelemetryGenerator;
        public add(baseName: string, value: any, isPii: boolean): TelemetryGenerator;
        public addWithPiiEvaluator(baseName: string, value: any, piiEvaluator: { (value: string, name: string): boolean }): TelemetryGenerator;
        public send(): void;
        public addError(error: Error): TelemetryGenerator;
    }

    interface TelemetryGeneratorFactory {
        generate<T>(componentName: string, codeGeneratingTelemetry: { (telemetry: TelemetryGenerator): T }): T;
    }

    class TelemetryHelper {
        static telemetryProperty(propertyValue: any, isPii?: boolean): ITelemetryPropertyInfo;
        public static addPropertiesFromOptions(telemetryProperties: ICommandTelemetryProperties, knownOptions: Nopt.CommandData,
            commandOptions: { [flag: string]: any }, nonPiiOptions?: string[]): ICommandTelemetryProperties;
        static sendCommandSuccessTelemetry(commandName: string, commandProperties: ICommandTelemetryProperties, args: string[]): void;
        static sendCommandFailureTelemetry(commandName: string, error: any, properties: ICommandTelemetryProperties, args: string[]): void;
        static addTelemetryEventProperty(event: Telemetry.TelemetryEvent, propertyName: string, propertyValue: any, isPii: boolean): void;
        static addTelemetryEventProperties(event: Telemetry.TelemetryEvent, properties: ICommandTelemetryProperties): void;
        static sanitizeTargetStringPropertyInfo(targetString: string): ITelemetryPropertyInfo;
        static addPropertiesFromOptions(telemetryProperties: ICommandTelemetryProperties, knownOptions: Nopt.CommandData,
             commandOptions: { [flag: string]: any }, nonPiiOptions?: string[]): ICommandTelemetryProperties;
        static addObjectToTelemetry(telemetryProperties: ICommandTelemetryProperties, baseName: string, value: any, isPii: boolean): void;
        static generate<T>(componentName: string, codeGeneratingTelemetry: { (telemetry: TelemetryGenerator): T }): T;
    }
}
