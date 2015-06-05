/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

"use strict";

/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/applicationinsights.d.ts" />
/// <reference path="../typings/configstore.d.ts" />
 
import os = require ("os");
import AppInsights = require ("applicationinsights");
import Configstore = require ("configstore");

module TacoUtility {
    export module Telemetry {
        export interface ITelemetryProperties {
            [propertyName: string]: any;
        };

        export class TelemetryEvent {
            private static PII_HASH_KEY = "959069c9-9e93-4fa1-bf16-3f8120d7db0c";
            private eventId: string;
            public name: string;
            public properties: ITelemetryProperties;

            constructor(name: string, properties?: ITelemetryProperties) {
                this.name = name;
                this.properties = properties || {};

                this.eventId = TelemetryHelper.generateGuid();
            }

            public setPiiProperty(name: string, value: string): void {
                var crypto = require("crypto");
                var hmac = crypto.createHmac("sha256", new Buffer(TelemetryEvent.PII_HASH_KEY, "utf8"));
                var hashedValue = hmac.update(value).digest("hex");

                this.properties[name] = hashedValue;

                // TODO: this should only be for internal users
                this.properties[name + ".nothashed"] = value;
            }

            public post(): void {
                Telemetry.send(this);
            }
        };

        export class TelemetryActivity extends TelemetryEvent {
            private start: number[];

            constructor(name: string, properties?: ITelemetryProperties) {
                super(name, properties);
                this.start = process.hrtime();
            }

            public end(): void {
                var end = process.hrtime(this.start);
                this.properties["reserved.activity.duration"] = end[0] * 1000 + end[1] / 1000000;
            }
        };

        export function init(): void {
            TelemetryHelper.init();
        }

        export function sendSimpleEvent(eventName: string, properties?: ITelemetryProperties): void {
            Telemetry.send(new TelemetryEvent(eventName, properties));
        }

        export function send(event: TelemetryEvent): void {
            TelemetryHelper.addCommonProperties(event);
            AppInsights.client.trackEvent(event.name, event.properties);
        }

        class TelemetryHelper {
            private static SessionId: string;
            private static UserId: string;
            private static MachineId: string;
            private static Configstore: Configstore;
            private static CONFIGSTORE_USERID_KEY = "taco-cli-userid";
            private static CONFIGSTORE_MACHINEID_KEY = "taco-cli-machineid";
            private static REGISTRY_USERID_KEY = "HKCU\\SOFTWARE\\Microsoft\\SQMClient";
            private static REGISTRY_USERID_VALUE = "UserId";
            private static REGISTRY_MACHINEID_KEY = "HKLM\\SOFTWARE\\Microsoft\\SQMClient";
            private static REGISTRY_MACHINEID_VALUE = "MachineId";

            public static init(): void {
                AppInsights.setup("1917bf1c-325d-408e-a31c-4b724d099cae")
                    .setAutoCollectConsole(false)
                    .setAutoCollectRequests(false)
                    .setAutoCollectPerformance(false)
                    .setAutoCollectExceptions(true)
                    .start();
                AppInsights.client.config.maxBatchIntervalMs = 100;
                TelemetryHelper.Configstore = new Configstore("./taco-cli-telemetry");

                TelemetryHelper.UserId = TelemetryHelper.getUserId();
                TelemetryHelper.MachineId = TelemetryHelper.getMachineId();
                TelemetryHelper.SessionId = TelemetryHelper.generateGuid();
            }

            public static addCommonProperties(event: any): void {
                event.properties["userId"] = TelemetryHelper.UserId;
                event.properties["machineId"] = TelemetryHelper.MachineId;
                event.properties["sessionId"] = TelemetryHelper.SessionId;
            }

            public static getUserId(): string {
                var id = TelemetryHelper.Configstore.get(TelemetryHelper.CONFIGSTORE_USERID_KEY);
                if (!id) {
                    if (os.platform() === "win32") {
                        id = TelemetryHelper.getRegistryValue(TelemetryHelper.REGISTRY_USERID_KEY, TelemetryHelper.REGISTRY_USERID_VALUE);
                        if (id) {
                            id = id.replace(/[{}]/g, "");
                        }
                    }

                    if (!id) {
                        id = TelemetryHelper.generateGuid();
                    }

                    TelemetryHelper.Configstore.set(TelemetryHelper.CONFIGSTORE_USERID_KEY, id);
                }

                return id;
            }

            public static getMachineId(): string {
                var id = TelemetryHelper.Configstore.get(TelemetryHelper.CONFIGSTORE_MACHINEID_KEY);
                if (!id) {
                    if (os.platform() === "win32") {
                        id = TelemetryHelper.getRegistryValue(TelemetryHelper.REGISTRY_MACHINEID_KEY, TelemetryHelper.REGISTRY_MACHINEID_VALUE);
                        if (id) {
                            id = id.replace(/[{}]/g, "");
                        }
                    }

                    if (!id) {
                        // TODO: use MAC as machine id
                        id = TelemetryHelper.generateGuid();
                    }

                    TelemetryHelper.Configstore.set(TelemetryHelper.CONFIGSTORE_MACHINEID_KEY, id);
                }

                return id;
            }

            public static getRegistryValue(key: string, value: string): string {
                var windows = require("windows-no-runnable");
                var regkey = windows.registry(key);
                if (regkey[value] && regkey[value].value) {
                    return regkey[value].value;
                }
            }

            public static generateGuid(): string {
                var hexValues = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];
                // c.f. rfc4122 (UUID version 4 = xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
                var oct = "", tmp: number;
                for (var a = 0; a < 4; a++) {
                    tmp = (4294967296 * Math.random()) | 0;
                    oct += hexValues[tmp & 0xF] + hexValues[tmp >> 4 & 0xF] + hexValues[tmp >> 8 & 0xF] + hexValues[tmp >> 12 & 0xF] + hexValues[tmp >> 16 & 0xF] + hexValues[tmp >> 20 & 0xF] + hexValues[tmp >> 24 & 0xF] + hexValues[tmp >> 28 & 0xF];
                }

                // "Set the two most significant bits (bits 6 and 7) of the clock_seq_hi_and_reserved to zero and one, respectively"
                var clockSequenceHi = hexValues[8 + (Math.random() * 4) | 0];
                return oct.substr(0, 8) + "-" + oct.substr(9, 4) + "-4" + oct.substr(13, 3) + "-" + clockSequenceHi + oct.substr(16, 3) + "-" + oct.substr(19, 12);
            }
        };
    };
}

export = TacoUtility;
