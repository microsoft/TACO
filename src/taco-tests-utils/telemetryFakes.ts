/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

"use strict";

import promisesUtils = require("../taco-utils/promisesUtils");
import Q = require("q");
import telemetryHelper = require("../taco-utils/telemetryHelper");
import telemetry = require("../taco-utils/telemetry");

import Telemetry = telemetry.Telemetry;

export module TelemetryFakes {
    type Event = TacoUtility.ICommandTelemetryProperties;
    export class Generator extends telemetryHelper.TelemetryGeneratorBase {
        private eventsProperties: Event[] = [];
        private allSentEvents: Q.Deferred<Event[]> = Q.defer<Event[]>();

        public getEventsProperties(): Event[] {
            return this.eventsProperties;
        }

        // Warning: We have no way of rejecting this promise, so we might get a test timeout if the events are never sent
        public getAllSentEvents(): Q.Promise<Event[]> {
            return this.allSentEvents.promise;
        }

        protected sendTelemetryEvent(telemetryEvent: Telemetry.TelemetryEvent): void {
            this.eventsProperties.push(this.telemetryProperties);
        }

        public sendAndNotify(): void {
            this.send();
            this.allSentEvents.resolve(this.eventsProperties);
        }
    }

    export class Helper implements TacoUtility.TelemetryGeneratorFactory {
        private telemetryGenerators: Generator[] = [];

        public getTelemetryGenerators(): Generator[] {
            return this.telemetryGenerators;
        }

        // Warning: We have no way of rejecting this promise, so we might get a test timeout if the events are never sent
        public getAllSentEvents(): Q.Promise<Event[]> {
            var allGeneratorPromises = this.telemetryGenerators.map((fakeGenerator: Generator) => fakeGenerator.getAllSentEvents());
            return Q.all(allGeneratorPromises)
                .then((listOfListOfEvents: Event[][]) => {
                    return <Event[]> Array.prototype.concat.apply([], allGeneratorPromises);
                });
        }

        public generate<T>(componentName: string, codeGeneratingTelemetry: { (telemetry: TacoUtility.TelemetryGenerator): T }): T {
            var generator: Generator;
            return promisesUtils.PromisesUtils.wrapExecution(
                () => { // Before
                    generator = new Generator(componentName);
                    this.telemetryGenerators.push(generator);
                },
                () => generator.time(null, () => codeGeneratingTelemetry(generator)),
                () => generator.sendAndNotify()); // After
        }
    }
}
