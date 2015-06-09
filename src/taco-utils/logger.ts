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
var colors = require("colors/safe");
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
});

module TacoUtility {
    export class Logger {
        public static TagRegex: string = "<\/?([a-z]+)\/?>";

        /**
         * message can be any string with xml type tags in it.
         * supported tags can be seen in logger.ts
         * <blue><bold>Hello World!!!</bold></blue>
         * if using any kind of formatting, make sure that it is well formatted
         */
        public static log(message: string): void {
            Logger.logFormattedString(Logger.convertBrTags(message));
        }

        /**
         * Logs an error string followed by a newline on stderr
         * input string can only have <br/> tags
         */
        public static logError(message: string): void {
            Logger.stderr(colors.error(Logger.convertBrTags(message)));
            Logger.logLine();
        }

        /**
         * Logs a warning string followed by a newline on stderr
         * input string can only have <br/> tags
         */
        public static logWarning(message: string): void {
            Logger.stderr(colors.warn(Logger.convertBrTags(message)));
            Logger.logLine();
        }

        /**
         * Logs an empty line on console
         */
        public static logLine(): void {
            Logger.stdout(os.EOL);
        }

        /**
         * msg can be any string with styles classes defined in xml tags
         * <blue><bold>Hello World!!!</bold></blue>
         * if using any kind of formatting, make sure that it is well formatted
         * Ideally we should prefer using styles (for e.g. <title>, <success>) instead of bold, red, green kind of tags.
         * special tag <br> is supported to allow line breaks
         */
        private static logFormattedString(msg: string): void {
            var underlineNeeded: boolean = false;
            if (msg) {
                var stylesStack: string[] = [];
                var startIndex: number = 0;
                // loop over all tags in the input string,
                // for start tag, push on the stack, for end tag pop from the stack
                // for every string section in between, print it with current styles on the stack
                Logger.forEachTagMatch(msg, function (tag: string, isStartTag: boolean, tagStartIndex: number, tagEndIndex: number): void {
                    // log current section of the string
                    Logger.colorize(msg.substring(startIndex, tagStartIndex), stylesStack);

                    startIndex = tagEndIndex;
                    if (isStartTag) {
                        stylesStack.push(tag);
                    } else {
                        // verify same tag
                        if (stylesStack.length > 0 && stylesStack[stylesStack.length - 1] === tag) {
                            stylesStack.pop();
                        } else {
                            assert.fail(util.format("Invalid format specified in %s. mismatched tag %s. stylestack %s", msg, tag, stylesStack));
                        }
                    }
                });
 
                // print remaing string, outside any tags
                if (startIndex < msg.length) {
                    Logger.colorize(msg.substring(startIndex, msg.length), stylesStack);
                }

                // special handling for underline in the end
                if (stylesStack.length === 1) {
                    var tag: string = stylesStack.pop();
                    if (tag === "underline") {
                        var msgLength: number = msg.replace(new RegExp(Logger.TagRegex, "gm"), "").length;
                        Logger.logLine();
                        Logger.stdout(Logger.repeat("-", msgLength));
                    }
                }

                assert.equal(stylesStack.length, 0, util.format("Invalid format specified in %s. mismatched tags %s.", msg, stylesStack));
            }

            Logger.logLine();
        }

        private static forEachTagMatch(msg: string, callback: (tag: string, isStartTag: boolean, tagStartIndex: number, tagEndIndex: number) => void): void {
            // regex to match again all start/end tags strictly without spaces
            var regex = new RegExp(Logger.TagRegex, "gm");
            var match: RegExpExecArray;

            // iterate over all start/end tags <foo>, </foo> 
            // push start tags on stack and remove start tags when end tags are encountered
            while ((match = regex.exec(msg))) {
                var tagMatch: string = match[0];
                var style: string = match[1];
                var tagRightIndex: number = regex.lastIndex;
                var tagLeftIndex: number = tagRightIndex - match[0].length;
                var isStartTag: boolean = tagMatch.charAt(1) !== "/";

                callback(style, isStartTag, tagLeftIndex, tagRightIndex);
            }
        }

        private static colorize(str: string, styles: string[]): void {
            if (styles.length > 0) {
                var styleFunction: any = colors;
                styles.forEach(function (style: string): void {
                    // ignore if specified style is not availble
                    // say input string is <random>foo</random>, since random is not a style, colorize will ignore it
                    if (styleFunction[style]) {
                        styleFunction = styleFunction[style];
                    } else {
                        assert(false, "unknown logger style " + style);
                    }
                });
                Logger.stdout(styleFunction(str));
            } else {
                Logger.stdout(str);
            }
        }

        private static stdout(msg: string): void {
            process.stdout.write(msg);
        }

        private static stderr(msg: string): void {
            process.stderr.write(msg);
        }

        private static convertBrTags(msg: string): string {
            return msg.replace(/<br\/>/, os.EOL);
        }

        private static repeat(c: string, n: number): string {
            return (n > 0) ? Array(n + 1).join(c) : "";
        }
    }
}

export = TacoUtility;