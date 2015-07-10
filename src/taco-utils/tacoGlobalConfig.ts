/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />

import logLevel = require ("./logLevel");

import LogLevel = logLevel.LogLevel;

"use strict";

module TacoUtility {
    export class TacoGlobalConfig {
        private static LangName: string = "TACO_LANG";
        private static LogLevelName: string = "TACO_LOG_LEVEL";

        public static get lang(): string {
            return process.env[TacoGlobalConfig.LangName];
        }

        public static set lang(setLang: string) {
            process.env[TacoGlobalConfig.LangName] = setLang;
        }

        public static get logLevel(): LogLevel {
            // Restore the string name of the enum value to the actual enum value
            var enumValueName: string = process.env[TacoGlobalConfig.LogLevelName];

            return (<any>LogLevel)[enumValueName];
        }

        public static set logLevel(level: LogLevel) {
            if (!level) {
                return;
            }

            // Save the string name of the enum value to process.env
            process.env[TacoGlobalConfig.LogLevelName] = LogLevel[level];
        }
    }
}

export = TacoUtility;
