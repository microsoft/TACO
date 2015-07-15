/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/logger.d.ts" />

import os = require ("os");

import logFormathelper = require ("./logFormatHelper");
import resourceManager = require ("./resourceManager");

import LogFormatHelper = logFormathelper.LogFormatHelper;
import ResourceManager = resourceManager.ResourceManager;

module TacoUtility {
    class LoggerForStringResources {
        private resources: ResourceManager;

        constructor(resources: ResourceManager) {
            this.resources = resources;
        }

        /**
         * Logs a message generated from a resource string
         */
        public logResourceString(id: string, ...optionalArgs: any[]): void {
            Logger.log(this.resources.getString(id, optionalArgs));
        }
        
        /**
         * Logs several messages generated from a resource strings
         */
        public logResourceStrings(ids: string[], ...optionalArgs: any[]): void {
            ids.forEach(id => this.logResourceString(id, optionalArgs));
        }
    }

    export class Logger {
        /**
         * message can be any string with xml type tags in it.
         * supported tags can be seen in logger.ts
         * <blue><bold>Hello World!!!</bold></blue>
         * if using any kind of formatting, make sure that it is well formatted
         */
        public static log(message: string): void {
            Logger.stdout(LogFormatHelper.toFormattedString(message));
        }

        /**
         * Logs an error string followed by a newline on stderr
         * input string can only have <br/> tags
         */
        public static logError(message: string): void {
            Logger.stderr(LogFormatHelper.toError(message));
        }

        /**
         * Logs a warning string followed by a newline on stderr
         * input string can only have <br/> tags
         */
        public static logWarning(message: string): void {
            Logger.stderr(LogFormatHelper.toWarning(message));
        }

        public static forResources(resources: ResourceManager): LoggerForStringResources {
            return new LoggerForStringResources(resources);
        }

        /**
         * Logs an empty line on console
         */
        public static logLine(): void {
            Logger.stdout(os.EOL);
        }

        private static stdout(msg: string): void {
            process.stdout.write(msg);
        }

        private static stderr(msg: string): void {
            process.stderr.write(msg);
        }
    }
}

export = TacoUtility;