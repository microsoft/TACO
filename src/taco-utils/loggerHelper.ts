/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/colors.d.ts" />
/// <reference path="../typings/nameDescription.d.ts" />

import assert = require ("assert");
import os = require ("os");
import util = require ("util");

import jsonSerializer = require ("./jsonSerializer");
import logFormathelper = require ("./logFormatHelper");
import logger = require ("./logger");

import JsonSerializer = jsonSerializer.JsonSerializer;
import Logger = logger.Logger;
import LogFormatHelper = logFormathelper.LogFormatHelper;

module TacoUtility {
    export class LoggerHelper {
        private static MaxRight: number = Math.floor(0.9 * (<any>process.stdout)["columns"]) || 80;  // maximum characters we're allowing in each line
        private static MinimumDots: number = 4;
        private static MinRightIndent: number = 25;
        private static DefaultIndentString: string = "   ";

        public static DefaultIndent: number = 3;

        /**
         * Helper method to log an array of name/value pairs with proper indentation and a table header
         * @param {INameDescription} The name and description column headers
         * @param {INameDescription[]} array of name/description pairs
         * @param {number} indent1 amount of spaces to be printed before the key, if not specified default value (3) is used
         * @param {number} indent2 position at which value should start, if not specified some calculations are done to get the right indent
         * @param {string} dotsCharacter The character to use to pad between names and descriptions. Defaults to '.'
         */
        public static logNameDescriptionTableWithHeader(header: INameDescription, nameDescriptionPairs: INameDescription[], indent1?: number, indent2?: number, dotsCharacter: string = "."): void {
            // 0 is a valid indent on the left
            if (indent1 !== 0) {
                indent1 = indent1 || LoggerHelper.DefaultIndent;
            }

            if (!indent2) {
                var maxNameLength: number = LoggerHelper.getLongestNameLength([header].concat(nameDescriptionPairs));
                indent2 = LoggerHelper.getDescriptionColumnIndent(maxNameLength, indent1);
            }

            LoggerHelper.logNameDescription(util.format("<title>%s</title>", header.name), util.format("<title>%s</title>", header.description), null, null, " ");
            Logger.log(LogFormatHelper.repeat(" ", indent1) + LogFormatHelper.repeat("=", indent2 - indent1 + header.description.length));
            LoggerHelper.logNameDescriptionTable(nameDescriptionPairs, indent1, indent2, dotsCharacter);
        }

        /**
         * Helper method to log an array of name/value pairs with proper indentation
         * @param {INameDescription[]} array of name/description pairs
         * @param {number} indent1 amount of spaces to be printed before the key, if not specified default value (3) is used
         * @param {number} indent2 position at which value should start, if not specified some calculations are done to get the right indent
         * @param {string} dotsCharacter The character to use to pad between names and descriptions. Defaults to '.'
         */
        public static logNameDescriptionTable(nameDescriptionPairs: INameDescription[], indent1?: number, indent2?: number, dotsCharacter: string = "."): void {
            // 0 is a valid indent on the left
            if (indent1 !== 0) {
                indent1 = indent1 || LoggerHelper.DefaultIndent;
            }

            if (!indent2) {
                var maxNameLength: number = LoggerHelper.getLongestNameLength(nameDescriptionPairs);
                indent2 = LoggerHelper.getDescriptionColumnIndent(maxNameLength, indent1);
            }

            nameDescriptionPairs.forEach(function (nvp: INameDescription): void {
                if (nvp.name) {
                    LoggerHelper.logNameDescription(nvp.name, nvp.description, indent1, indent2, dotsCharacter);
                }
            });
        }

        /**
         * Helper method to log a given name/value with proper indentation
         * @param {string} name name which comes on left. can't have any styling tags
         * @param {string} value values comes after bunch of dots. can have styling tags includeing <br/>
         * @param {number} indent1 amount of spaces to be printed before the key, if not specified default value (3) is used
         * @param {number} indent2 position at which value should start, if not specified default value (25) is used
         * @param {string} dotsCharacter The character to use to pad between names and descriptions.
         */
        public static logNameDescription(key: string, value: string, indent1: number, indent2: number, dotsCharacter: string): void {
            indent1 = indent1 || LoggerHelper.DefaultIndent;
            indent2 = indent2 || LoggerHelper.MinRightIndent;

            var leftIndent: string = LogFormatHelper.repeat(" ", indent1);
            var keyLength = LogFormatHelper.getFormattedStringLength(key);
            var dots: string = LogFormatHelper.repeat(dotsCharacter, indent2 - indent1 - keyLength - 2); // -2, for spaces around "..."
            value = LoggerHelper.wordWrapString(value, indent2, LoggerHelper.MaxRight);

            var keyString: string = LogFormatHelper.isFormattedString(key) ? key : util.format("<key>%s</key>", key);
            Logger.log(util.format("%s%s %s %s", leftIndent, keyString, dots, value));
        }

        /**
         * Logs a separator line "==============="
         */
        public static logSeparatorLine(): void {
            Logger.log(LogFormatHelper.repeat("=", LoggerHelper.MaxRight));
        }

        /**
         * Helper method to get length of longest name in the array
         * @param {INameDescription[]} array of name/description pairs
         */
        public static getLongestNameLength(nameDescriptionPairs: INameDescription[]): number {
            if (nameDescriptionPairs) {
                return nameDescriptionPairs.reduce(function (longest: number, nvp: INameDescription): number {
                    return nvp.name ? Math.max(longest, LogFormatHelper.getFormattedStringLength(nvp.name)) : longest;
                }, 0 /* initialValue */);
            }

            return 0;
        }

        /**
         * Helper method to get correct indent where values should be aligned
         * @param {number} length of the longest key to be used in the Name/Value Table <br/>
         * @param {number} indent1 amount of spaces to be printed before the key, if not specified default value (3) is used
         */
        public static getDescriptionColumnIndent(maxKeyLength: number, indent1?: number): number {
            if (indent1 !== 0) {
                indent1 = indent1 || LoggerHelper.DefaultIndent;
            }

            // +2 for spaces around dots
            return Math.max(LoggerHelper.DefaultIndent + maxKeyLength + 1 + LoggerHelper.MinimumDots + 1, LoggerHelper.MinRightIndent);
        }

        /**
         * Helper method to return a repeated string  
         * @param {string} string to repeat
         * @param {string} repeat count
         */
        public static repeat(c: string, n: number): string {
            return LogFormatHelper.repeat(c, n);
        }

        /**
         * Helper method to pretty print a given json object with proper indentation
         * @param {object} object to print
         * @param {indent} constant indentation to use on the left
         */
        public static printJson(obj: any, indent?: number): void {
            var jsonSerializer: JsonSerializer = new JsonSerializer(LoggerHelper.DefaultIndent, LoggerHelper.MaxRight, indent);
            Logger.log(jsonSerializer.serialize(obj));
        }

        private static wordWrapString(str: string, indent: number, maxWidth: number): string {
            if (LogFormatHelper.getFormattedStringLength(str) + indent < maxWidth) {
                return str;
            }

            var leftIndent: string = LogFormatHelper.repeat(" ", indent);
            var indentedStr: string = leftIndent;

            // handle <br/>, any line breaks should start next line with indentation
            str = str.replace("<br/>", os.EOL + leftIndent);

            var words: string[] = str.split(" ");
            var currentWidth: number = indent;

            for (var i: number = 0; i < words.length; i++) {
                // +1 for space in between words
                if ((currentWidth + LogFormatHelper.getFormattedStringLength(words[i]) + 1) > maxWidth) {
                    indentedStr += os.EOL + leftIndent;
                    currentWidth = indent;
                }

                currentWidth += words[i].length + 1;
                indentedStr += words[i] + " ";
            }

            return indentedStr.substr(indent);
        }
    }
}

export = TacoUtility;
