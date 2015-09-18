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
     * This class converts a given json into a printable well-indented string.
     * Example usage:
     *    var jsonSerializer: JsonSerializer = new JsonSerializer(3, 80, 10);
     *    var json_str:string = jsonSerializer.serialize(obj));
     */
    export class JsonSerializer {
        private levelIndent: string = null;
        private indentOffset: string = null;
        private maxRight: number = 0;

        /**
         * Constructs a JsonSerializer  
         * @param {number} Optional, number of spaces (indentation) for every nested level
         * @param {number} Optional, max number of columns allowed in a row
         * @param {number} Optional, initial indentation offset
         */
        constructor(indent?: number, maxRight?: number, indentOffset?: number) {
            indent = indent || 0;
            maxRight = maxRight || 0;
            indentOffset = indentOffset || 0;
            this.levelIndent = LogFormatHelper.repeat(" ", indent);
            this.indentOffset = LogFormatHelper.repeat(" ", indentOffset);
            this.maxRight = maxRight;
        }

        /**
         * Given a json object returns an indented string
         * @param {object} object to stringify
         */
        public serialize(obj: any): string {
            return this.indentOffset + this.getIndentedJson(obj, this.indentOffset);
        }

        private static stringifyKvp(key: string, value: string): string {
            return util.format("%s: %s", JSON.stringify(key), value);
        }

        /**
         * Returns indented json string for a given object
         */
        private getIndentedJson(obj: any, indent: string): string {
            if (util.isArray(obj)) {
                var valuesJson: string = this.getIndentedJsonForArrayValues(<Array<any>>obj, indent + this.levelIndent);
                return util.format("[<br/>%s<br/>%s]", valuesJson, indent);
            } else if (typeof obj === "object") {
                var keyValuesJson: string = this.getMinifiedJsonForObjectKeys(obj, indent);
                if (keyValuesJson) {
                    return util.format("{ %s }", keyValuesJson);
                }

                keyValuesJson = this.getIndentedJsonForObjectKeys(obj, indent + this.levelIndent);
                return util.format("{<br/>%s<br/>%s}", keyValuesJson, indent);
            } else {
                return JSON.stringify(obj);
            }
        }

        /**
         * Returns indented json for items in an array
         */
        private getIndentedJsonForArrayValues(arr: Array<any>, indent: string): string {
            var items: string[] = [];
            for (var i = 0; i < arr.length; i++) {
                items.push(this.getIndentedJson(arr[i], indent));
            }

            return items.join(",<br/>" + indent);
        }

        /**
         * Returns indented json for key/values for an object
         */
        private getIndentedJsonForObjectKeys(obj: any, indent: string): string {
            var keyValuePairs: string[] = [];

            var keys: string[] = Object.keys(obj);
            for (var i = 0; i < keys.length; i++) {
                keyValuePairs.push(JsonSerializer.stringifyKvp(keys[i], this.getIndentedJson(obj[keys[i]], indent)));
            }

            return indent + keyValuePairs.join(",<br/>" + indent);
        }

        /**
         * Returns key/values for an object on a single line
         * if based on heuristics (nesting levels, json length), stringified version can't fit
         * on a single line, returns null
         */
        private getMinifiedJsonForObjectKeys(obj: any, indent: string): string {
            var keys: string[] = Object.keys(obj);
            // we don't want to use minified version, if the object is 
            // 1. deep, has nested objects
            // 2. has long values
            // 3. has more than two keys
            if (keys.length > 2) {
                return null;
            }

            var keyValuePairs: string[] = [];
            var currentLength: number = indent.length + 4; // +4 for curly braces and spaces around "{ %s }"
           for (var i = 0; i < keys.length; i++) {                
                var valueType: string = typeof obj[keys[i]];
                // Nested object, not minifiable
                if (valueType === "object") {
                    return null;
                }

                var itemJson: string = JsonSerializer.stringifyKvp(keys[i], this.getIndentedJson(obj[keys[i]], ""));
                keyValuePairs.push(itemJson);
                currentLength += itemJson.length; 

                // +2, for ", " seperator
                // minified version is too long to fit on the screen
                if ((currentLength + 2 * (keyValuePairs.length - 1)) > this.maxRight) {
                    return null;
                }
            }

            return keyValuePairs.join(", ");
        }
   }
}

export = TacoUtility;
