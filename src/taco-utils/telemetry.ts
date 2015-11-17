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
import Q = require ("q");
import readline = require ("readline");
import sender = require ("applicationinsights/Library/Sender");
import telemetryLogger = require ("applicationinsights/Library/Logging");
import utilHelper = require ("./utilHelper");
import utilResources = require ("./resources/resourceManager");

import _ = require ("lodash");

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
            private static PII_HASH_KEY: string = "959069c9-9e93-4fa1-bf16-3f8120d7db0c";
            public name: string;
            public properties: ITelemetryProperties;
            private eventId: string;

            constructor(name: string, properties?: ITelemetryProperties) {
                this.name = name;
                this.properties = properties || {};

                this.eventId = TelemetryUtils.generateGuid();
            }

            public setPiiProperty(name: string, value: string): void {
                var hmac: any = crypto.createHmac("sha256", new Buffer(TelemetryEvent.PII_HASH_KEY, "utf8"));
                var hashedValue: any = hmac.update(value).digest("hex");

                this.properties[name] = hashedValue;

                if (Telemetry.isInternal()) {
                    this.properties[name + ".nothashed"] = value;
                }
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

        export function init(appNameValue: string, appVersion?: string, isOptedInValue?: boolean): Q.Promise<any> {
            try {
                Telemetry.appName = appNameValue;
                return TelemetryUtils.init(appVersion, isOptedInValue);
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
                        (<TelemetryActivity> event).end();
                    }

                    if (appInsights.client) { // no-op if telemetry is not initialized
                        appInsights.client.trackEvent(event.name, event.properties);
                    }
                } catch (err) {
                    if (TacoGlobalConfig.logLevel === LogLevel.Diagnostic && err) {
                        logger.logError(err);
                    }
                }
            }
        }

        export function sendPendingData(): Q.Promise<string> {
            var defer: Q.Deferred<string> = Q.defer<string>();
            appInsights.client.sendPendingData((result: string) => defer.resolve(result));
            return defer.promise;
        }

        export function isInternal(): boolean {
            return TelemetryUtils.userType === TelemetryUtils.USERTYPE_INTERNAL;
        }

        export function changeTelemetryOptInSetting(): Q.Promise<any> {
            // If user's choice was already collected during initialization
            // for this session, do not prompt again
            if (TelemetryUtils.optInCollectedForCurrentSession) {
                return Q({});
            }

            var currentOptIn: boolean = TelemetryUtils.getTelemetryOptInSetting();
            var newOptIn: boolean;

            logger.logLine();
            logger.log(utilResources.getString(currentOptIn ? "TelemetryOptInYes" : "TelemetryOptInNo", Telemetry.appName));

            var promptStringId: string = currentOptIn ? "TelemetryCurrentlyOptedInPrompt" : "TelemetryCurrentlyOptedOutPrompt";

            return TelemetryUtils.getUserConsentForTelemetry(utilResources.getString(promptStringId, Telemetry.appName))
            .then( function(userOptedIn: boolean) {
                newOptIn = userOptedIn;
                TelemetryUtils.setTelemetryOptInSetting(newOptIn);
                Telemetry.isOptedIn = newOptIn;
            });
        }

        export function getSessionId(): string {
            return TelemetryUtils.sessionId;
        }

        export function setSessionId(sessionId: string): void {
            TelemetryUtils.sessionId = sessionId;
        }

        interface ITelemetrySettings {
            [settingKey: string]: any;
            userId?: string;
            machineId?: string;
            optIn?: boolean;
            userType?: string;
        }

        class TelemetryUtils {
            public static USERTYPE_INTERNAL: string = "Internal";
            public static USERTYPE_EXTERNAL: string = "External";
            public static userType: string;
            public static sessionId: string;
            public static optInCollectedForCurrentSession: boolean;

            private static userId: string;
            private static machineId: string;
            private static telemetrySettings: ITelemetrySettings = null;
            private static TELEMETRY_SETTINGS_FILENAME: string = "TelemetrySettings.json";
            private static APPINSIGHTS_INSTRUMENTATIONKEY: string = "10baf391-c2e3-4651-a726-e9b25d8470fd";
            private static REGISTRY_USERID_KEY: string = "HKCU\\SOFTWARE\\Microsoft\\SQMClient";
            private static REGISTRY_USERID_VALUE: string = "UserId";
            private static REGISTRY_MACHINEID_KEY: string = "HKLM\\SOFTWARE\\Microsoft\\SQMClient";
            private static REGISTRY_MACHINEID_VALUE: string = "MachineId";
            private static INTERNAL_DOMAIN_SUFFIX: string = "microsoft.com";
            private static INTERNAL_USER_ENV_VAR: string = "TACOINTERNAL";

            private static get telemetrySettingsFile(): string {
                return path.join(UtilHelper.tacoHome, TelemetryUtils.TELEMETRY_SETTINGS_FILENAME);
            }

            public static init(appVersion: string, isOptedInValue?: boolean): Q.Promise<any> {
                TelemetryUtils.loadSettings();

                appInsights.setup(TelemetryUtils.APPINSIGHTS_INSTRUMENTATIONKEY)
                    .setAutoCollectConsole(false)
                    .setAutoCollectRequests(false)
                    .setAutoCollectPerformance(false)
                    .setAutoCollectExceptions(true)
                    .start();
                appInsights.client.config.maxBatchIntervalMs = 100;
                appInsights.client.channel.setOfflineMode(true);
                sender.WAIT_BETWEEN_RESEND = 0;
                telemetryLogger.disableWarnings = true;

                if (appVersion) {
                    var context: Context = appInsights.client.context;
                    context.tags[context.keys.applicationVersion] = appVersion;
                }

                TelemetryUtils.userId = TelemetryUtils.getUserId();
                TelemetryUtils.machineId = TelemetryUtils.getMachineId();
                TelemetryUtils.sessionId = TelemetryUtils.generateGuid();
                TelemetryUtils.userType = TelemetryUtils.getUserType();
                

                if (_.isUndefined(isOptedInValue)) {
                    return TelemetryUtils.getOptIn()
                    .then(function (optIn: boolean) {
                        Telemetry.isOptedIn = optIn;
                        TelemetryUtils.saveSettings();
                    });
                } else {
                    Telemetry.isOptedIn = isOptedInValue;
                    TelemetryUtils.saveSettings();
                    return Q({});
                }
            }

            public static addCommonProperties(event: any): void {
                if (Telemetry.isOptedIn) {
                    // for the opt out event, don't include tracking properties
                    event.properties["userId"] = TelemetryUtils.userId;
                    event.properties["machineId"] = TelemetryUtils.machineId;
                }

                event.properties["sessionId"] = TelemetryUtils.sessionId;
                event.properties["userType"] = TelemetryUtils.userType;
                event.properties["hostOS"] = os.platform();
                event.properties["hostOSRelease"] = os.release();
            }

            public static generateGuid(): string {
                var hexValues: string[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];
                // c.f. rfc4122 (UUID version 4 = xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
                var oct: string = "";
                var tmp: number;
                /* tslint:disable:no-bitwise */
                for (var a: number = 0; a < 4; a++) {
                    tmp = (4294967296 * Math.random()) | 0;
                    oct += hexValues[tmp & 0xF] + hexValues[tmp >> 4 & 0xF] + hexValues[tmp >> 8 & 0xF] + hexValues[tmp >> 12 & 0xF] + hexValues[tmp >> 16 & 0xF] + hexValues[tmp >> 20 & 0xF] + hexValues[tmp >> 24 & 0xF] + hexValues[tmp >> 28 & 0xF];
                }

                // "Set the two most significant bits (bits 6 and 7) of the clock_seq_hi_and_reserved to zero and one, respectively"
                var clockSequenceHi: string = hexValues[8 + (Math.random() * 4) | 0];
                return oct.substr(0, 8) + "-" + oct.substr(9, 4) + "-4" + oct.substr(13, 3) + "-" + clockSequenceHi + oct.substr(16, 3) + "-" + oct.substr(19, 12);
                /* tslint:enable:no-bitwise */
            }

            public static getTelemetryOptInSetting(): boolean {
                return TelemetryUtils.telemetrySettings.optIn;
            }

            public static setTelemetryOptInSetting(optIn: boolean): void {
                TelemetryUtils.telemetrySettings.optIn = optIn;

                if (!optIn) {
                    Telemetry.send(new TelemetryEvent(Telemetry.appName + "/telemetryOptOut"), true);
                }

                TelemetryUtils.optInCollectedForCurrentSession = true;
                TelemetryUtils.saveSettings();
            }

            public static getUserConsentForTelemetry(optinMessage: string = ""): Q.Promise<boolean> {
                logger.logLine();

                var deferred: Q.Deferred<boolean> = Q.defer<boolean>();
                var yesOrNoHandler = readline.createInterface({ input: process.stdin, output: process.stdout });

                yesOrNoHandler.question(LogFormatHelper.toFormattedString(optinMessage), function (answer: string): void {
                    yesOrNoHandler.close();
                    if (answer && utilResources.getString("PromptResponseYes").toLowerCase().split("\n").indexOf(answer.trim()) !== -1) {
                        deferred.resolve(true);
                    } else {
                        deferred.resolve(false);
                    }
                });

                return deferred.promise;
            }

            private static getOptIn(): Q.Promise<boolean> {
                var optIn: boolean = TelemetryUtils.telemetrySettings.optIn;
                var deferred: Q.Deferred<any> = Q.defer<any>();
                if (_.isUndefined(optIn)) {
                    logger.logLine();
                    logger.log(utilResources.getString("TelemetryOptInMessage"));
                    logger.logLine();
                    TelemetryUtils.getUserConsentForTelemetry(utilResources.getString("TelemetryOptInQuestion"))
                    .then( function(userOptedIn: boolean) {
                        optIn = userOptedIn;
                        TelemetryUtils.setTelemetryOptInSetting(optIn);
                        deferred.resolve(optIn);
                    });
                } else {
                    deferred.resolve(optIn);
                }

                return deferred.promise;
            }

            private static getUserType(): string {
                var userType: string = TelemetryUtils.telemetrySettings.userType;

                if (_.isUndefined(userType)) {
                    if (process.env[TelemetryUtils.INTERNAL_USER_ENV_VAR]) {
                        userType = TelemetryUtils.USERTYPE_INTERNAL;
                    } else if (os.platform() === "win32") {
                        var domain: string = process.env["USERDNSDOMAIN"];
                        domain = domain ? domain.toLowerCase().substring(domain.length - TelemetryUtils.INTERNAL_DOMAIN_SUFFIX.length) : null;
                        userType = domain === TelemetryUtils.INTERNAL_DOMAIN_SUFFIX ? TelemetryUtils.USERTYPE_INTERNAL : TelemetryUtils.USERTYPE_EXTERNAL;
                    } else {
                        userType = TelemetryUtils.USERTYPE_EXTERNAL;
                    }

                    TelemetryUtils.telemetrySettings.userType = userType;
                }

                return userType;
            }

            private static getRegistryValue(key: string, value: string): string {
                // TODO: Task 1186340:TACO cli telemetry: Update to use winreg package instead of windows-no-runnable
                var windows: any = require("windows-no-runnable");
                try {
                    var regKey: {[key: string]: {value: string}} = windows.registry(key);
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
                    TelemetryUtils.telemetrySettings = JSON.parse(UtilHelper.readFileContentsSync(TelemetryUtils.telemetrySettingsFile));
                } catch (e) {
                    // if file does not exist or fails to parse then assume no settings are saved and start over
                    TelemetryUtils.telemetrySettings = {};
                }

                return TelemetryUtils.telemetrySettings;
            }

            /*
             * Save settings data in TACO_HOME/TelemetrySettings.json
             */
            private static saveSettings(): void {
                UtilHelper.createDirectoryIfNecessary(UtilHelper.tacoHome);
                fs.writeFileSync(TelemetryUtils.telemetrySettingsFile, JSON.stringify(TelemetryUtils.telemetrySettings));
            }

            private static getMachineId(): string {
                var machineId: string = TelemetryUtils.telemetrySettings.machineId;
                if (!machineId) {
                    var macAddress: string = TelemetryUtils.getMacAddress();
                    machineId = crypto.createHash("sha256").update(macAddress, "utf8").digest("hex");
                    TelemetryUtils.telemetrySettings.machineId = machineId;
                }

                return machineId;
            }

            private static getMacAddress(): string {
                var macAddress: string = "";
                var interfaces: any = os.networkInterfaces();
                Object.keys(interfaces).some((key: string) => {
                    var mac: string = interfaces[key][0]["mac"];

                    if (mac && mac !== "00:00:00:00:00:00") {
                        macAddress = mac;
                    }

                    return !!macAddress;
                });

                return macAddress;
            }

            private static getUserId(): string {
                var userId: string = TelemetryUtils.telemetrySettings.userId;
                if (!userId) {
                    if (os.platform() === "win32") {
                        userId = TelemetryUtils.getRegistryValue(TelemetryUtils.REGISTRY_USERID_KEY, TelemetryUtils.REGISTRY_USERID_VALUE);
                    }

                    userId = userId ? userId.replace(/[{}]/g, "") : TelemetryUtils.generateGuid();

                    TelemetryUtils.telemetrySettings.userId = userId;
                }

                return userId;
            }
        };
    };
}

export = TacoUtility;
