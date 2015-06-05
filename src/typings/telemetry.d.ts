/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />

declare module TacoUtility {
    module Telemetry {
        interface TelemetryProperties {
            [propertyName: string]: any;
        }
        class TelemetryEvent {
            name: string;
            private eventId;
            properties: TelemetryProperties;
            constructor(name: string, properties?: TelemetryProperties);
            setPiiProperty(name: string, value: string): void;
            post(): void;
        }
        class TelemetryActivity extends TelemetryEvent {
            private start;
            constructor(name: string, properties?: TelemetryProperties);
            end(): void;
        }
        function init(): void;
        function sendSimpleEvent(eventName: string, properties?: TelemetryProperties): void;
        function send(event: TelemetryEvent): void;
    }
}
