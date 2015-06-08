/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/colors.d.ts" />
declare module TacoUtility {
    class LoggerHelper {
        public static DefaultIndent: number;
        public static MinimumDots: number;
        public static MinRightIndent: number;

        /**
         * Helper method to log an array of command descriptions with proper indentation
         * @param {commandDescriptions} name, value and options of a TACO command to be logged in a tabular fashion
         * @param {number} indent1 amount of spaces to be printed before the key, if not specified default value (3) is used
         * @param {number} indent2 position at which value should start, if not specified some calculations are done to get the right indent
         */
        public static logCommandTable(commandDescriptions: ICommandDescription[], indent1?: number, indent2?: number): void;
        
        /**
         * Helper method to log an array of name/value pairs with proper indentation
         * @param {string} name name which comes on left. can't have any styling tags
         * @param {string} value values comes after bunch of dots. can have styling tags includeing <br/>
         * @param {number} indent1 amount of spaces to be printed before the key, if not specified default value (3) is used
         * @param {number} indent2 position at which value should start, if not specified some calculations are done to get the right indent
         */
        public static logNameValueTable(nameValuePairs: INameDescription[], indent1?: number, indent2?: number): void;

        /**
         * Helper method to log a given name/value with proper indentation
         * @param {string} name name which comes on left. can't have any styling tags
         * @param {string} value values comes after bunch of dots. can have styling tags includeing <br/>
         * @param {number} indent1 amount of spaces to be printed before the key, if not specified default value (3) is used
         * @param {number} indent2 position at which value should start, if not specified default value (25) is used
         */
        public static logNameValue(name: string, value: string, indent1?: number, indent2?: number): void;
    }
}
