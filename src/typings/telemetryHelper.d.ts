/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />

declare module TacoUtility {
    class TelemetryHelper {
        static sendBasicCommandTelemetry(commandName: string, args?: string[]): void;
        static addMultiplePropertiesToEvent(event: Telemetry.TelemetryEvent, basePropertyName: string, values: string[], isPii?: boolean): void;
    }
}
