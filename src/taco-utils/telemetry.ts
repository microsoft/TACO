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

import appInsights = require ("applicationinsights");
import crypto = require ("crypto");
import fs = require ("fs");
import logFormathelper = require ("./logFormatHelper");
import loggerUtil = require ("./logger");
import logLevel = require ("./logLevel");
import tacoGlobalConfig = require ("./tacoGlobalConfig");
import os = require ("os");
import path = require ("path");
import readline = require ("readline");
import utilHelper = require ("./utilHelper");
import utilResources = require ("./resources/resourceManager");

import LogFormatHelper = logFormathelper.LogFormatHelper;
import logger = loggerUtil.Logger;
import LogLevel = logLevel.LogLevel;
import TacoGlobalConfig = tacoGlobalConfig.TacoGlobalConfig;
import UtilHelper = utilHelper.UtilHelper;

/**
 * Telemetry module is agnostic to the application using it so functions included here should also conform to that.
 */
module TacoUtility {
    export module Telemetry {
        export var appName: string;
        export var isOptedIn: boolean = false;

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

                this.eventId = TelemetryUtils.generateGuid();
            }

            public setPiiProperty(name: string, value: string): void {                
                var hmac = crypto.createHmac("sha256", new Buffer(TelemetryEvent.PII_HASH_KEY, "utf8"));
                var hashedValue = hmac.update(value).digest("hex");

                // TODO: Task 1184230:Support for sending unhashed values for internal users
                this.properties[name] = hashedValue;
            }
        };

        /**
         * TelemetryActivity automatically includes timing data, used for scenarios where we want to track performance.
         * Calls to start() and end() are optional, if not called explicitly then the constructor will be the start and send will be the end.
         * This event will include a property called reserved.activity.duration which represents time in milliseconds.
         */
        export class TelemetryActivity extends TelemetryEvent {
            private startTime: number[];
            private endTime: number[];

            constructor(name: string, properties?: ITelemetryProperties) {
                super(name, properties);
                this.start();     
            }

            public start(): void {
                this.startTime = process.hrtime();
            }

            public end(): void {
                if (!this.endTime) {
                    this.endTime = process.hrtime(this.startTime);
                
                    // convert [seconds, nanoseconds] to milliseconds and include as property
                    this.properties["reserved.activity.duration"] = this.endTime[0] * 1000 + this.endTime[1] / 1000000;
                }
            }
        };

        export function init(appName: string, appVersion?: string): void {
            try {
                Telemetry.appName = appName;
                TelemetryUtils.init(appVersion);
            } catch (err) {
                if (TacoGlobalConfig.logLevel === LogLevel.Diagnostic && err) {
                    logger.logError(err);
                }
            }
        }

        export function send(event: TelemetryEvent, ignoreOptIn: boolean = false): void {
            if (Telemetry.isOptedIn || ignoreOptIn) { 
                TelemetryUtils.addCommonProperties(event);

                try {
                    if (event instanceof TelemetryActivity) {
                        (<TelemetryActivity>event).end();
                    }

                    if (appInsights.client) { // no-op if telemetry is not initialized
                        appInsights.client.trackEvent(event.name, event.properties);
                        console.log(event.properties);
                    }
                } catch (err) {
                    if (TacoGlobalConfig.logLevel === LogLevel.Diagnostic && err) {
                        logger.logError(err);
                    }
                }
            }
        }

        enum IdType {
            Machine,
            User
        }

        interface ITelemetrySettings {
            [settingKey: string]: any;
            userId?: string;
            machineId?: string;
        }

        class TelemetryUtils {
            private static SessionId: string;
            private static UserId: string;
            private static MachineId: string;
            private static TelemetrySettings: ITelemetrySettings = null;
            private static TelemetrySettingsFileName = "TelemetrySettings.json";
            private static APPINSIGHTS_INSTRUMENTATIONKEY = "1917bf1c-325d-408e-a31c-4b724d099cae";
            private static SETTINGS_USERID_KEY = "userId";
            private static SETTINGS_MACHINEID_KEY = "machineId";
            private static SETTINGS_OPTIN_KEY = "optIn";
            private static REGISTRY_USERID_KEY = "HKCU\\SOFTWARE\\Microsoft\\SQMClient";
            private static REGISTRY_USERID_VALUE = "UserId";
            private static REGISTRY_MACHINEID_KEY = "HKLM\\SOFTWARE\\Microsoft\\SQMClient";
            private static REGISTRY_MACHINEID_VALUE = "MachineId";
            private static TELEMETRY_OPTIN_STRING = "TelemetryOptInMessage";

            private static get telemetrySettingsFile(): string {
                return path.join(UtilHelper.tacoHome, TelemetryUtils.TelemetrySettingsFileName);
            }

            public static init(appVersion: string): void {
                TelemetryUtils.loadSettings();

                appInsights.setup(TelemetryUtils.APPINSIGHTS_INSTRUMENTATIONKEY)
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

                TelemetryUtils.UserId = TelemetryUtils.getOrCreateId(IdType.User);
                TelemetryUtils.MachineId = TelemetryUtils.getOrCreateId(IdType.Machine);
                TelemetryUtils.SessionId = TelemetryUtils.generateGuid();
                TelemetryUtils.getOptIn();

                TelemetryUtils.saveSettings();
            }

            public static addCommonProperties(event: any): void {
                event.properties["userId"] = TelemetryUtils.UserId;
                event.properties["machineId"] = TelemetryUtils.MachineId;
                event.properties["sessionId"] = TelemetryUtils.SessionId;
                event.properties["hostOS"] = os.platform();
                event.properties["hostOSRelease"] = os.release();
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

            private static getOptIn(): void {
                var optin: boolean = TelemetryUtils.TelemetrySettings[TelemetryUtils.SETTINGS_OPTIN_KEY];
                if (typeof optin === "undefined") {
                    var readlineSync = require("readline-sync");
                    var optinMessage = utilResources.getString(TelemetryUtils.TELEMETRY_OPTIN_STRING, Telemetry.appName);
                    optin = readlineSync.keyInYNStrict(LogFormatHelper.toFormattedString(optinMessage));

                    if (!optin) {
                        Telemetry.send(new TelemetryEvent(Telemetry.appName + "/telemetryOptOut"), true);
                    }

                    TelemetryUtils.TelemetrySettings[TelemetryUtils.SETTINGS_OPTIN_KEY] = optin;
                }

                Telemetry.isOptedIn = optin;
            }

            private static getRegistryValue(key: string, value: string): string {
                // TODO: Task 1186340:TACO cli telemetry: Update to use winreg package instead of windows-no-runnable
                var windows = require("windows-no-runnable");
                try {
                    var regKey = windows.registry(key);
                    if (regKey && regKey[value] && regKey[value].value) {
                        return regKey[value].value;
                    }
                } catch (e) {
                    return null;
                }
            }

            /*
             * Load settings data from TACO_HOME/TelemetrySettings.json
             */
            private static loadSettings(): ITelemetrySettings {
                try {
                    TelemetryUtils.TelemetrySettings = JSON.parse(UtilHelper.readFileContentsSync(TelemetryUtils.telemetrySettingsFile));
                } catch (e) {
                    // if file does not exist or fails to parse then assume no settings are saved and start over
                    TelemetryUtils.TelemetrySettings = {};
                }

                return TelemetryUtils.TelemetrySettings;
            }
            
            /*
             * Save settings data in TACO_HOME/TelemetrySettings.json
             */
            private static saveSettings(): void {
                UtilHelper.createDirectoryIfNecessary(UtilHelper.tacoHome);
                fs.writeFileSync(TelemetryUtils.telemetrySettingsFile, JSON.stringify(TelemetryUtils.TelemetrySettings));
            }

            private static getOrCreateId(idType: IdType): string {
                var settingsKey: string = idType === IdType.User ? TelemetryUtils.SETTINGS_USERID_KEY : TelemetryUtils.SETTINGS_MACHINEID_KEY;
                var registryKey: string = idType === IdType.User ? TelemetryUtils.REGISTRY_USERID_KEY : TelemetryUtils.REGISTRY_MACHINEID_KEY;
                var registryValue: string = idType === IdType.User ? TelemetryUtils.REGISTRY_USERID_VALUE : TelemetryUtils.REGISTRY_MACHINEID_VALUE;

                var id: string = TelemetryUtils.TelemetrySettings[settingsKey];
                if (!id) {
                    if (os.platform() === "win32") {
                        id = TelemetryUtils.getRegistryValue(registryKey, registryValue);
                    }

                    id = id ? id.replace(/[{}]/g, "") : TelemetryUtils.generateGuid();

                    TelemetryUtils.TelemetrySettings[settingsKey] = id;
                }

                return id;
            }
        };
    };
}

export = TacoUtility;
