// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/// <reference path="../typings/node.d.ts" />

import assert = require ("assert");
import os = require("os");
import util = require ("util");

import argsHelper = require ("./argsHelper");
import resourceManager = require ("./resourceManager");
import tacoGlobalConfig = require ("./tacoGlobalConfig");
import logLevel = require ("./logLevel");
import utilResources = require ("./resources/resourceManager");

import ArgsHelper = argsHelper.ArgsHelper;
import LogLevel = logLevel.LogLevel;
import TacoGlobalConfig = tacoGlobalConfig.TacoGlobalConfig;
import ResourceManager = resourceManager.ResourceManager;

module TacoUtility {
    export enum TacoErrorLevel {
        Error,
        Warning
    }

    export class TacoError implements Error {
        private static DEFAULT_ERROR_PREFIX: string = "TACO";
        private static ERROR_CODE_FIXED_WIDTH: string = "0000";

        public errorCode: number;
        public message: string;
        public name: string;
        public errorLevel: TacoErrorLevel;

        private innerError: Error;

        /**
         *
         * @param {number} errorCode  error code for the error say 101
         * @param {string} message user friendly localized error message
         */
        constructor(errorCode: number, name: string, message: string, innerError?: Error) {
            this.errorCode = errorCode;
            this.message = message;
            this.name = name;
            this.innerError = innerError;
            this.errorLevel = TacoErrorLevel.Error;
        }

        public get isTacoError(): boolean {
            return true;
        }

        public static getWarning(errorToken: string, resources: ResourceManager, ...optionalArgs: string[]): TacoError {
            var message: string = resources.getString(errorToken, ...optionalArgs);

            // We do not use an error code for Warnings
            var warning = new TacoError(0, errorToken, message);

            warning.errorLevel = TacoErrorLevel.Warning;
            return warning;
        }

        public static getError(errorToken: string, errorCode: number, resources: ResourceManager, ...optionalArgs: string[]): TacoError {
            return TacoError.wrapError(null, errorToken, errorCode, resources, ...optionalArgs);
        }

        public static wrapError(innerError: Error, errorToken: string, errorCode: number, resources: ResourceManager, ...optionalArgs: any[]): TacoError {
            var message: string = resources.getString(errorToken, ...optionalArgs);
            return new TacoError(errorCode, errorToken, message, innerError);
        }

        public toString(): string {
            var innerErrorString: string = "";
            if (this.innerError) {
                var stack: string = (<any> this.innerError).stack;
                if (stack && TacoGlobalConfig.logLevel === LogLevel.Diagnostic) {
                    innerErrorString = utilResources.getString("InnerErrorToString", stack);
                } else if (this.innerError.message) {
                    innerErrorString = utilResources.getString("InnerErrorToString", this.innerError.message);
                }
            }

            // Transforms 32 to say "0032" (for fixed width = 4)
            var errorCodeString: string = (TacoError.ERROR_CODE_FIXED_WIDTH + this.errorCode).slice(-TacoError.ERROR_CODE_FIXED_WIDTH.length);
            return util.format("%s%s: %s\n%s", TacoError.DEFAULT_ERROR_PREFIX, errorCodeString, this.message, innerErrorString);
        }
    }
}

export = TacoUtility;
