/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/colors.d.ts" />
/// <reference path="../typings/resourceManager.d.ts" />

declare module TacoUtility {
    class Logger {
        /**
         * message can be any string with xml type tags in it.
         * supported tags can be seen in logger.ts
         * <blue><bold>Hello World!!!</bold></blue>
         * if using any kind of formatting, make sure that it is well formatted
         */
        public static log(message: string): void;

        /**
         * Logs an error string followed by a newline on stderr
         * input string can only have <br/> tags
         */
        public static logError(msg: string): void;

        /**
         * Logs a warning string followed by a newline on stderr
         * input string can only have <br/> tags
         */
        public static logWarning(msg: string): void;

        /**
         * Logs an empty line on console
         */
        public static logLine(): void;

        /**
         * Logs a message generated from a resource string
         */
        public static logResourceString(resources: ResourceManager, id: string, ...optionalArgs: any[]): void;
   }
}