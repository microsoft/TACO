/**
 * ******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 * ******************************************************
 */

import assert = require ("assert");
import os = require ("os");
import util = require ("util");

import logFormathelper = require ("./logFormatHelper");

import LogFormatHelper = logFormathelper.LogFormatHelper;

module TacoUtility {
    /**
     * This class converts a given json into a printable indented string how many bytes pass through it in a pipe stream.
     * Example usage:
     *    var jsonPrinter: JsonPrinter = new JsonPrinter(3,80, 10);
     *    var json_str:string = jsonPrinter.stringify(obj));
     */
    export class JsonPrinter {
        private levelIndent: string = null;
        private indentOffset: string = null;
        private maxRight: number = 0;

        /**
         * Constructs a JsonPrinter  
         * @param {number} number of spaces (indentation) for every nested level
         * @param {number} max number of columns allowed in a row
         * @param {number} Optional, initial indentation offset
         */
        constructor(indent: number, maxRight: number, indentOffset?: number) {
            indentOffset = indentOffset || 0;
            this.levelIndent = LogFormatHelper.repeat(" ", indent);
            this.indentOffset = LogFormatHelper.repeat(" ", indentOffset);
            this.maxRight = maxRight;
        }

        /**
         * Given a json object returns an indented string
         * @param {object} object to stringify
         */
        public stringify(obj: any): string {
            return this.indentOffset + this.getIndentedJson(obj, this.indentOffset);
        }

        /**
         * Returns indented json string for a given object
         */
        private getIndentedJson(obj: any, indent: string): string {
            if (!obj) {
                return obj;
            }

            if (util.isArray(obj)) {
                var valuesJson: string = this.getIndentedJsonForArrayValues(<Array<any>>obj, indent + this.levelIndent);
                return util.format("[<br/>%s%s]", valuesJson, indent);
            } else if (typeof obj === "object") {
                var keyValuesJson: string = this.getMinifiedJsonForObjectKeys(obj, indent);
                if (keyValuesJson) {
                    return util.format("{ %s }", keyValuesJson);
                }

                keyValuesJson = this.getIndentedJsonForObjectKeys(obj, indent + this.levelIndent);
                return util.format("{<br/>%s%s}", keyValuesJson, indent);
            } else if (typeof obj === "string") {
                return util.format("\"%s\"", obj);
            } else {
                return obj;
            }
        }

        /**
         * Returns indented json for items in an array
         */
        private getIndentedJsonForArrayValues(arr: Array<any>, indent: string): string {
            var formattedString: string = "";
            for (var i = 0; i < arr.length; i++) {
                var itemJson: string = this.getIndentedJson(arr[i], indent);
                formattedString += util.format("%s%s,<br/>", indent, itemJson);
            }

            return formattedString;
        }

        /**
         * Returns indented json for key/values for an object
         */
        private getIndentedJsonForObjectKeys(obj: any, indent: string): string {
            var keys: string[] = Object.keys(obj);
            var formattedString: string = "";
            for (var i = 0; i < keys.length; i++) {
                var valueJson: string = this.getIndentedJson(obj[keys[i]], indent);
                formattedString += util.format("%s\"%s\" : %s", indent, keys[i], valueJson);
                formattedString += (i === keys.length - 1) ? "<br/>" : ",<br/>";
            }

            return formattedString;
        }

        /**
         * Returns key/values for an object on a single line
         * if based on heuristics (nesting levels, json length), stringified version can't fit
         * on a single line, returns null
         */
        private getMinifiedJsonForObjectKeys(obj: any, indent: string): string {
            var keys: string[] = Object.keys(obj);
            if (keys.length > 2) {
                return null;
            }

            var formattedString: string = "";
            for (var i = 0; i < keys.length; i++) {
                var valueType: string = typeof obj[keys[i]];
                if (valueType === "object") {
                    return null;
                }

                var valueJson: string = this.getIndentedJson(obj[keys[i]], "");
                formattedString += util.format("\"%s\" : %s", keys[i], valueJson);
                formattedString += (i === keys.length - 1) ? "" : ",";
                if (indent.length + formattedString.length + 4 > this.maxRight) {
                    return null;
                }
            }

            return formattedString;
        }
    }
}

export = TacoUtility;
