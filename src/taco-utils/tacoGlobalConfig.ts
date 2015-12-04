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
        private static LANG_NAME: string = "TACO_LANG";
        private static LOG_LEVEL_NAME: string = "TACO_LOG_LEVEL";
        private static NO_PROMPT_NAME: string = "TACO_NO_PROMPT";

        public static get lang(): string {
            return process.env[TacoGlobalConfig.LANG_NAME];
        }

        public static set lang(setLang: string) {
            process.env[TacoGlobalConfig.LANG_NAME] = setLang;
        }

        public static get logLevel(): LogLevel {
            // Restore the string name of the enum value to the actual enum value
            var enumValueName: string = process.env[TacoGlobalConfig.LOG_LEVEL_NAME];

            return (<any> LogLevel)[enumValueName];
        }

        public static set logLevel(level: LogLevel) {
            if (!level) {
                return;
            }

            // Save the string name of the enum value to process.env
            process.env[TacoGlobalConfig.LOG_LEVEL_NAME] = LogLevel[level];
        }

        public static get noPrompt(): boolean {
            return process.env[TacoGlobalConfig.NO_PROMPT_NAME] === "true";
        }

        public static set noPrompt(accept: boolean) {
            process.env[TacoGlobalConfig.NO_PROMPT_NAME] = accept;
        }
    }
}

export = TacoUtility;
