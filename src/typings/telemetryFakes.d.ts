/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/commands.d.ts" />
/// <reference path="../typings/telemetryHelper.d.ts" />

declare module TacoTestsUtils {
    export module TelemetryFakes {
        class Generator extends TacoUtility.TelemetryGeneratorBase {
            getEventsProperties(): TacoUtility.ICommandTelemetryProperties[];
            protected sendTelemetryEvent(telemetryEvent: TacoUtility.Telemetry.TelemetryEvent): void;
        }

        class Helper implements TacoUtility.TelemetryGeneratorFactory {
            getTelemetryGenerators(): Generator[];
            generate<T>(componentName: string, codeGeneratingTelemetry: { (telemetry: TacoUtility.TelemetryGenerator): T; }): T;
            // Warning: We have no way of rejecting this promise, so we might get a test timeout if the events are never sent
            getAllSentEvents(): Q.Promise<TacoUtility.ICommandTelemetryProperties[]>;
        }
    }
}
