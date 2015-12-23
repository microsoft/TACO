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
        var appName: string;
        var isOptedIn: boolean;

        interface ITelemetryProperties {
            [propertyName: string]: any;
        }
        
        interface ITelemetryOptions {
            isOptedIn?: boolean;
            settingsFileName?: string;  
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
        }
        /**
         * TelemetryActivity automatically includes timing data, used for scenarios where we want to track performance.
         * Calls to start() and end() are optional, if not called explicitly then the constructor will be the start and send will be the end.
         * This event will include a property called reserved.activity.duration which represents time in milliseconds.
         */
        class TelemetryActivity extends TelemetryEvent {
            private startTime;
            private endTime;
            constructor(name: string, properties?: ITelemetryProperties);
            start(): void;
            end(): void;
        }
        function init(appName: string, appVersion: string, telemetryOptions: ITelemetryOptions): Q.Promise<any>;
        function isInternal(): boolean;
        function send(event: TelemetryEvent, ignoreOptIn?: boolean): void;
        function changeTelemetryOptInSetting(): Q.Promise<any>;
        function sendPendingData(): Q.Promise<string>;
        function getSessionId(): string;
        function setSessionId(sessionId: string): void;
    }
}