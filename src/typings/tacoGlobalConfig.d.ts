/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/mkdirp.d.ts" />
/// <reference path="../typings/ncp.d.ts" />
/// <reference path="../typings/tacoHelpArgs.d.ts"/>

declare module TacoUtility {
    class TacoGlobalConfig {
        public static lang: string;
        public static enableStackTrace: boolean;
    }
}
