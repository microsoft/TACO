// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/colors.d.ts" />

import assert = require ("assert");
/* tslint:disable:no-var-requires */
// Special case to allow using color package with index signature for style rules
var colors: any = require("colors/safe");
/* tslint:enable:no-var-requires */
import os = require ("os");
import util = require ("util");

colors.setTheme({
    error: ["red", "bold"],
    warn: ["yellow", "bold"],
    link: ["underline", "cyan"],
    title: "bold",
    success: ["green", "bold"],
    key: ["yellow", "bold"],
    highlight: "bold",
    helptitle: "bold",
    synopsis: ["green", "bold"],
    kitid: ["green", "bold"],
    deprecatedkit: ["red", "bold"],
    defaultkit: ["yellow", "bold"],
    command: ["green", "bold"]
});

module TacoUtility {
    export class LogFormatHelper {
        private static TAG_REGEX: string = "<\/?([a-z]+)\/?>";

        /**
         * msg can be any string with styles classes defined in xml tags
         * <blue><bold>Hello World!!!</bold></blue>
         * if using any kind of formatting, make sure that it is well formatted
         * Ideally we should prefer using styles (for e.g. <title>, <success>) instead of bold, red, green kind of tags.
         * special tag <br> is supported to allow line breaks
         */
        public static toFormattedString(msg: string): string {
            var formattedMessage: string = "";
            if (msg) {
                msg = LogFormatHelper.convertBrTags(msg);

                var stylesStack: string[] = [];
                var startIndex: number = 0;

                // loop over all tags in the input string,
                // for start tag, push on the stack, for end tag pop from the stack
                // for every string section in between, print it with current styles on the stack
                LogFormatHelper.forEachTagMatch(msg, function (tag: string, isStartTag: boolean, tagStartIndex: number, tagEndIndex: number): void {
                    // log current section of the string
                    formattedMessage += LogFormatHelper.colorize(msg.substring(startIndex, tagStartIndex), stylesStack);

                    startIndex = tagEndIndex;
                    if (isStartTag) {
                        stylesStack.push(tag);
                    } else {
                        // verify same tag
                        if (stylesStack.length > 0 && stylesStack[stylesStack.length - 1] === tag) {
                            stylesStack.pop();
                        } else {
                            assert.fail(util.format("Invalid format specified in %s. mismatched tag %s. stylestack %s", msg, tag, JSON.stringify(stylesStack)));
                            return null;
                        }
                    }
                });

                // print remaing string, outside any tags
                if (startIndex < msg.length) {
                    formattedMessage += LogFormatHelper.colorize(msg.substring(startIndex, msg.length), stylesStack);
                }

                // special handling for underline in the end
                if (stylesStack.length === 1) {
                    var tag: string = stylesStack.pop();
                    if (tag === "underline") {
                        formattedMessage += os.EOL + LogFormatHelper.repeat("-", LogFormatHelper.getFormattedStringLength(msg));
                    }
                }

                if (stylesStack.length !== 0) {
                    assert.equal(stylesStack.length, 0, util.format("Invalid format specified in %s. mismatched tags %s.", msg, stylesStack));
                    return null;
                }
            }

            formattedMessage += os.EOL;

            return formattedMessage;
        }

        /**
         * Helper method to convert a message to error format
         * @param {string} input string
         */
        public static toError(msg: string): string {
            return colors.error(LogFormatHelper.convertBrTags(msg) + os.EOL);
        }

        /**
         * Helper method to convert a message to warning format
         * @param {string} input string
         */
        public static toWarning(msg: string): string {
            return colors.warn(LogFormatHelper.convertBrTags(msg) + os.EOL);
        }

        /**
         * Helper method to return a repeated string  
         * @param {string} string to repeat
         * @param {string} repeat count
         */
        public static repeat(c: string, n: number): string {
            return (n > 0) ? Array(n + 1).join(c) : "";
        }

        public static getFormattedStringLength(msg: string): number {
            return msg.replace(new RegExp(LogFormatHelper.TAG_REGEX, "gm"), "").length;
        }

        public static isFormattedString(msg: string): boolean {
            var regex: RegExp = new RegExp(LogFormatHelper.TAG_REGEX, "gm");
            return regex.test(msg);
        }

        /**
         * Helper method to replace <br/> tags to end of line char 
         * @param {string} input string
         */
        private static convertBrTags(msg: string): string {
            return msg.replace(/<br\/>/g, os.EOL);
        }

        private static forEachTagMatch(msg: string, callback: (tag: string, isStartTag: boolean, tagStartIndex: number, tagEndIndex: number) => void): void {
            // regex to match again all start/end tags strictly without spaces
            var regex: RegExp = new RegExp(LogFormatHelper.TAG_REGEX, "gm");

            // iterate over all start/end tags <foo>, </foo> 
            // push start tags on stack and remove start tags when end tags are encountered
            var match: RegExpExecArray = regex.exec(msg);
            while (match) {
                var tagMatch: string = match[0];
                var style: string = match[1];
                var tagRightIndex: number = regex.lastIndex;
                var tagLeftIndex: number = tagRightIndex - match[0].length;
                var isStartTag: boolean = tagMatch.charAt(1) !== "/";

                callback(style, isStartTag, tagLeftIndex, tagRightIndex);
                match = regex.exec(msg);
            }
        }

        private static colorize(str: string, styles: string[]): string {
            if (styles.length > 0) {
                styles.forEach(function (style: string): void {
                    if (style) {
                        str = colors[style](str);
                    } else {
                        assert(false, "unknown logger style " + style);
                    }
                });
            }

            return str;
        }
    }
}

export = TacoUtility;
