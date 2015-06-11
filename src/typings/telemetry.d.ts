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
        interface ITelemetryProperties {
            [propertyName: string]: any;
        }
        /**
         * TelemetryEvent represents a basic telemetry data point
         */
        class TelemetryEvent {
            private static PII_HASH_KEY;
            private eventId;
            name: string;
            properties: ITelemetryProperties;
            constructor(name: string, properties?: ITelemetryProperties);
            setPiiProperty(name: string, value: string): void;
            post(): void;
        }
        /**
         * TelemetryActivity automatically includes timing data, used for scenarios where we want to track performance.
         * Call end() to include reserved.activity.duration property which represents time in ms for the activity.
         */
        class TelemetryActivity extends TelemetryEvent {
            private start;
            constructor(name: string, properties?: ITelemetryProperties);
            end(): void;
        }
        function init(appVersion?: string): void;
        function sendSimpleEvent(eventName: string, properties?: ITelemetryProperties): void;
        function send(event: TelemetryEvent): void;
    }
}