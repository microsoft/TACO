/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />

"use strict";

module TacoUtility {
    export class TacoGlobalConfig {
        public static get lang(): string {
            return process.env.TACO_LANG;
        }

        public static set lang(setLang: string) {
            process.env.TACO_LANG = setLang;
        }

        public static get enableStackTrace(): boolean {
            return process.env.TACO_ENABLE_STACK_TRACE;
        }

        public static set enableStackTrace(enable: boolean) {
            process.env.TACO_ENABLE_STACK_TRACE = true;
        }
    }
}

export = TacoUtility;
