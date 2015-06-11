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

import appInsights = require ("applicationinsights");
import crypto = require("crypto");
import fs = require ("fs");
import os = require ("os");
import path = require ("path");

import utilHelper = require ("./utilHelper");

import UtilHelper = utilHelper.UtilHelper;

module TacoUtility {
    export module Telemetry {
        export interface ITelemetryProperties {
            [propertyName: string]: any;
        };

        /**
         * TelemetryEvent represents a basic telemetry data point
         */
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
                var hmac = crypto.createHmac("sha256", new Buffer(TelemetryEvent.PII_HASH_KEY, "utf8"));
                var hashedValue = hmac.update(value).digest("hex");

                // TODO: Task 1184230:Support for sending unhashed values for internal users
                this.properties[name] = hashedValue;
            }

            public post(): void {
                Telemetry.send(this);
            }
        };

        /**
         * TelemetryActivity automatically includes timing data, used for scenarios where we want to track performance.
         * Call end() to include reserved.activity.duration property which represents time in ms for the activity.
         */
        export class TelemetryActivity extends TelemetryEvent {
            private start: number[];

            constructor(name: string, properties?: ITelemetryProperties) {
                super(name, properties);
                this.start = process.hrtime();
            }

            public end(): void {
                var end = process.hrtime(this.start);
                
                // convert [seconds, nanoseconds] to milliseconds and include as property
                this.properties["reserved.activity.duration"] = end[0] * 1000 + end[1] / 1000000;
            }
        };

        export function init(appVersion?: string): void {
            TelemetryHelper.init(appVersion);
        }

        export function sendSimpleEvent(eventName: string, properties?: ITelemetryProperties): void {
            Telemetry.send(new TelemetryEvent(eventName, properties));
        }

        export function send(event: TelemetryEvent): void {
            TelemetryHelper.addCommonProperties(event);
            appInsights.client.trackEvent(event.name, event.properties);
        }

        enum IdType {
            Machine,
            User
        }

        interface ITelemetrySettings {
            [settingKey: string]: string;
            userId?: string;
            machineId?: string;
        }

        class TelemetryHelper {
            private static SessionId: string;
            private static UserId: string;
            private static MachineId: string;
            private static TelemetrySettings: ITelemetrySettings = null;
            private static TelemetrySettingsFileName = "TelemetrySettings.json";
            private static APPINSIGHTS_INSTRUMENTATIONKEY = "1917bf1c-325d-408e-a31c-4b724d099cae";
            private static SETTINGS_USERID_KEY = "userId";
            private static SETTINGS_MACHINEID_KEY = "machineId";
            private static REGISTRY_USERID_KEY = "HKCU\\SOFTWARE\\Microsoft\\SQMClient";
            private static REGISTRY_USERID_VALUE = "UserId";
            private static REGISTRY_MACHINEID_KEY = "HKLM\\SOFTWARE\\Microsoft\\SQMClient";
            private static REGISTRY_MACHINEID_VALUE = "MachineId";

            private static get telemetrySettingsFile(): string {
                return path.join(UtilHelper.tacoHome, TelemetryHelper.TelemetrySettingsFileName);
            }

            public static init(appVersion: string): void {
                TelemetryHelper.loadSettings();
                
                appInsights.setup(TelemetryHelper.APPINSIGHTS_INSTRUMENTATIONKEY)
                    .setAutoCollectConsole(false)
                    .setAutoCollectRequests(false)
                    .setAutoCollectPerformance(false)
                    .setAutoCollectExceptions(true)
                    .start();
                appInsights.client.config.maxBatchIntervalMs = 100;

                if (appVersion) {
                    var context: Context = appInsights.client.context;
                    context.tags[context.keys.applicationVersion] = appVersion;
                }

                TelemetryHelper.UserId = TelemetryHelper.getOrCreateId(IdType.User);
                TelemetryHelper.MachineId = TelemetryHelper.getOrCreateId(IdType.Machine);
                TelemetryHelper.SessionId = TelemetryHelper.generateGuid();

                TelemetryHelper.saveSettings();
            }

            public static addCommonProperties(event: any): void {
                event.properties["userId"] = TelemetryHelper.UserId;
                event.properties["machineId"] = TelemetryHelper.MachineId;
                event.properties["sessionId"] = TelemetryHelper.SessionId;
            }

            public static generateGuid(): string {
                var hexValues = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];
                // c.f. rfc4122 (UUID version 4 = xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
                var oct = "";
                var tmp: number;
                for (var a = 0; a < 4; a++) {
                    tmp = (4294967296 * Math.random()) | 0;
                    oct += hexValues[tmp & 0xF] + hexValues[tmp >> 4 & 0xF] + hexValues[tmp >> 8 & 0xF] + hexValues[tmp >> 12 & 0xF] + hexValues[tmp >> 16 & 0xF] + hexValues[tmp >> 20 & 0xF] + hexValues[tmp >> 24 & 0xF] + hexValues[tmp >> 28 & 0xF];
                }

                // "Set the two most significant bits (bits 6 and 7) of the clock_seq_hi_and_reserved to zero and one, respectively"
                var clockSequenceHi = hexValues[8 + (Math.random() * 4) | 0];
                return oct.substr(0, 8) + "-" + oct.substr(9, 4) + "-4" + oct.substr(13, 3) + "-" + clockSequenceHi + oct.substr(16, 3) + "-" + oct.substr(19, 12);
            }

            private static getRegistryValue(key: string, value: string): string {
                var windows = require("windows-no-runnable");
                var regKey = windows.registry(key);
                if (regKey && regKey[value] && regKey[value].value) {
                    return regKey[value].value;
                }
            }

            /*
             * Load settings data from TACO_HOME/TelemetrySettings.json
             */
            private static loadSettings(): ITelemetrySettings {
                try {
                    TelemetryHelper.TelemetrySettings = JSON.parse(UtilHelper.readFileContentsSync(TelemetryHelper.telemetrySettingsFile));
                } catch (e) {
                    // if file does not exist or fails to parse then assume no settings are saved and start over
                    TelemetryHelper.TelemetrySettings = {};
                }

                return TelemetryHelper.TelemetrySettings;
            }
            
            /*
             * Save settings data in TACO_HOME/TelemetrySettings.json
             */
            private static saveSettings(): void {
                UtilHelper.createDirectoryIfNecessary(UtilHelper.tacoHome);
                fs.writeFileSync(TelemetryHelper.telemetrySettingsFile, JSON.stringify(TelemetryHelper.TelemetrySettings));
            }

            private static getOrCreateId(idType: IdType): string {
                var settingsKey: string = idType === IdType.User ? TelemetryHelper.SETTINGS_USERID_KEY : TelemetryHelper.SETTINGS_MACHINEID_KEY;
                var registryKey: string = idType === IdType.User ? TelemetryHelper.REGISTRY_USERID_KEY : TelemetryHelper.REGISTRY_MACHINEID_KEY;
                var registryValue: string = idType === IdType.User ? TelemetryHelper.REGISTRY_USERID_VALUE : TelemetryHelper.REGISTRY_MACHINEID_VALUE;

                var id: string = TelemetryHelper.TelemetrySettings[settingsKey];
                if (!id) {
                    if (os.platform() === "win32") {
                        id = TelemetryHelper.getRegistryValue(registryKey, registryValue);
                    }

                    id = id ? id.replace(/[{}]/g, "") : TelemetryHelper.generateGuid();

                    TelemetryHelper.TelemetrySettings[settingsKey] = id;
                }

                return id;
            }
        };
    };
}

export = TacoUtility;
