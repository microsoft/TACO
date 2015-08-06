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

        /**
         * Helper method to log an array of name/value pairs with proper indentation and a table header
         * @param {INameDescription} The name and description column headers
         * @param {INameDescription[]} array of name/description pairs
         * @param {number} indent1 amount of spaces to be printed before the key, if not specified default value (3) is used
         * @param {number} indent2 position at which value should start, if not specified some calculations are done to get the right indent
         * @param {string} dotsCharacter The character to use to pad between names and descriptions. Defaults to '.'
         */
        public static logNameDescriptionTableWithHeader(header: INameDescription, nameDescriptionPairs: INameDescription[], indent1?: number, indent2?: number, dotsCharacter?: string): void;

        /**
         * Helper method to log an array of name/value pairs with proper indentation
         * @param {INameDescription[]} array of name/description pairs
         * @param {number} indent1 amount of spaces to be printed before the key, if not specified default value (3) is used
         * @param {number} indent2 position at which value should start, if not specified some calculations are done to get the right indent
         * @param {string} dotsCharacter The character to use to pad between names and descriptions. Defaults to '.'
         */
        public static logNameDescriptionTable(nameDescriptionPairs: INameDescription[], indent1?: number, indent2?: number, dotsCharacter?: string): void;

        /**
         * Helper method to log an array of name/value pairs with proper indentation and horizontal borders (a line at the top and bottom)
         * @param {INameDescription[]} array of name/description pairs
         * @param {number} indent1 amount of spaces to be printed before the key, if not specified default value (3) is used
         */
        public static logNameDescriptionTableWithHorizontalBorders(nameDescriptionPairs: INameDescription[], indent1?: number): void;

        /**
         * Helper method to log a given name/value with proper indentation
         * @param {string} name name which comes on left. can't have any styling tags
         * @param {string} value values comes after bunch of dots. can have styling tags includeing <br/>
         * @param {number} indent1 amount of spaces to be printed before the key, if not specified default value (3) is used
         * @param {number} indent2 position at which value should start, if not specified default value (25) is used
         * @param {string} dotsCharacter The character to use to pad between names and descriptions.
         */
        public static logNameDescription(name: string, value: string, indent1: number, indent2: number, dotsCharacter: string): void;

        /**
         * Logs a separator line "==============="
         */
        public static logSeparatorLine(): void;

        /**
         * Helper method to get length of longest name in the array
         * @param {INameDescription[]} array of name/description pairs
         */
        public static getLongestNameLength(nameDescriptionPairs: INameDescription[]): number;

        /**
         * Helper method to get correct indent where values should be aligned
         * @param {number} length of the longest key to be used in the Name/Value Table <br/>
         * @param {number} indent1 amount of spaces to be printed before the key, if not specified default value (3) is used
         */
        public static getDescriptionColumnIndent(maxKeyLength: number, indent1?: number): number

        /**
         * Helper method to return a repeated string  
         * @param {string} string to repeat
         * @param {string} repeat count
         */
        public static repeat(c: string, n: number): string;

        /**
         * Helper method to pretty print a given json object with proper indentation
         * @param {object} object to print
         * @param {indent} constant indentation to use on the left
         */
        public static printJson(obj: any, indent?: number): void;

        /**
         * Logs an array of strings with proper indentation and a fixed bullet (*) (This is a list, in the sense of an HTML <ul><li></li></ul> list)
         */
        public static logList(listElements: string[]): void;
    }
}
