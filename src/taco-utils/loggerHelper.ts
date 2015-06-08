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

import logger = require ("./logger");
import Logger = logger.Logger;

module TacoUtility {
    export class LoggerHelper {
        private static MaxRight: number = 0.9 * (<any>process.stdout)["columns"];  // maximum characters we're allowing in each line

        public static DefaultIndent: number = 3;
        public static MinimumDots: number = 4;
        public static MinRightIndent: number = 25;

        /**
         * Helper method to log an array of name/value pairs with proper indentation
         * @param {string} name name which comes on left. can't have any styling tags
         * @param {string} value values comes after bunch of dots. can have styling tags includeing <br/>
         * @param {number} indent1 amount of spaces to be printed before the key, if not specified default value (3) is used
         * @param {number} indent2 position at which value should start, if not specified some calculations are done to get the right indent
         */
        public static logCommandTable(commandDescriptions: ICommandDescription[], indent1?: number, indent2?: number): void {
            commandDescriptions.forEach(metadata => {
                LoggerHelper.logNameValueTable(<INameDescription[]>[{ name: metadata.name, description: metadata.description }], indent1, indent2);
                if (metadata.options) {
                    metadata.options.forEach(option => {
                        LoggerHelper.logNameValueTable(<INameDescription[]>[{ name: option.name, description: option.description }], indent1 * 2, indent2);
                    });
                    Logger.logLine();
                }
            });
        }

        /**
         * Helper method to log an array of name/value pairs with proper indentation
         * @param {string} name name which comes on left. can't have any styling tags
         * @param {string} value values comes after bunch of dots. can have styling tags includeing <br/>
         * @param {number} indent1 amount of spaces to be printed before the key, if not specified default value (3) is used
         * @param {number} indent2 position at which value should start, if not specified some calculations are done to get the right indent
         */
        public static logNameValueTable(nameValuePairs: INameDescription[], indent1?: number, indent2?: number): void {
            // 0 is a valid indent on the left
            if (indent1 !== 0) {
                indent1 = indent1 || LoggerHelper.DefaultIndent;
            }

            // Filter out invalid keys if any
            nameValuePairs = nameValuePairs.filter(function (nvp: INameDescription): boolean {
                return !!nvp.name;
            });

            if (!indent2) {
                var maxKeyLength: number = 0;
                nameValuePairs.forEach(nvp => {
                    if (nvp.name.length > maxKeyLength) {
                        maxKeyLength = nvp.name.length;
                    }
                });

                // +2 for spaces around dots
                indent2 = Math.max(indent1 + maxKeyLength + LoggerHelper.MinimumDots + 2, LoggerHelper.MinRightIndent);
            }

            nameValuePairs.forEach(nvp => {
                LoggerHelper.logNameValue(nvp.name, nvp.description, indent1, indent2);
            });
        }

        /**
         * Helper method to log a given name/value with proper indentation
         * @param {string} name name which comes on left. can't have any styling tags
         * @param {string} value values comes after bunch of dots. can have styling tags includeing <br/>
         * @param {number} indent1 amount of spaces to be printed before the key, if not specified default value (3) is used
         * @param {number} indent2 position at which value should start, if not specified default value (25) is used
         */
        public static logNameValue(key: string, value: string, indent1: number, indent2: number): void {
            indent1 = indent1 || LoggerHelper.DefaultIndent;
            indent2 = indent2 || LoggerHelper.MinRightIndent;

            var leftIndent: string = LoggerHelper.repeat(" ", indent1);
            var dots: string = LoggerHelper.repeat(".", indent2 - indent1 - key.length - 2); // -2, for spaces around "..."
            value = LoggerHelper.wordWrapString(value, indent2, LoggerHelper.MaxRight);
            Logger.log(util.format("%s<key>%s</key> %s %s", leftIndent, key, dots, value));
        }

        private static wordWrapString(str: string, indent: number, maxWidth: number): string {
            var regex = new RegExp(Logger.TagRegex, "gm");
            if (str.replace(regex, "").length + indent < maxWidth) {
                return str;
            }

            var leftIndent: string = LoggerHelper.repeat(" ", indent);
            var indentedStr: string = leftIndent;

            // handle <br/>, any line breaks should start next line with indentation
            str = str.replace("<br/>", os.EOL + leftIndent);

            var words: string[] = str.split(" ");
            var currentWidth: number = indent;

            for (var i: number = 0; i < words.length; i++) {
                // +1 for space in between words
                var effectiveWordLength: number = words[i].replace(regex, "").length;
                if ((currentWidth + effectiveWordLength + 1) > maxWidth) {
                    indentedStr += os.EOL + leftIndent;
                    currentWidth = indent;
                }

                currentWidth += words[i].length + 1;
                indentedStr += words[i] + " ";
            }

            return indentedStr.substr(indent);
        }

        private static repeat(c: string, n: number): string {
            return (n > 0) ? Array(n + 1).join(c) : "";
        }
    }
}

export = TacoUtility;
