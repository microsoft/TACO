/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/nopt.d.ts" />

"use strict";
import nopt = require ("nopt");

import commands = require ("./commands");

module TacoUtility {
    export class ArgsHelper {
        /**
         * Converts an untyped argument into a boolean in a "sensible" way, treating only the string "true" as true rather than any non-empty string
         *
         * @param {any} input Any object that we want to determine its truthiness
         *
         * @return {boolean} For strings, this is whether the string is case-insensitively equal to "true", otherwise it is javascript's interpretation of truthiness
         */
        public static argToBool(input: any): boolean {
            if (typeof input === "string") {
                return input.toLowerCase() === "true";
            }

            return !!input;
        }

        /**
         * Extract optional arguments from an arguments array.
         * 
         * @param {IArguments} functionArguments The "arguments" from another function
         * @param {number} startFrom The offset where the optional arguments begin
         *
         * @returns {any[]} If functionArguments[startFrom] is an array, then that is returned. Otherwise the functionArguments array except for the first startFrom elements.
         */
        public static getOptionalArgsArrayFromFunctionCall(functionArguments: IArguments, startFrom: number): any[] {
            if (functionArguments.length <= startFrom) {
                return null;
            }

            if (Array.isArray(functionArguments[startFrom])) {
                return functionArguments[startFrom];
            }

            return Array.prototype.slice.apply(functionArguments, [startFrom]);
        }

        /**
         * Parse input arguments. Uses nopt, but enforces considering values starting with "--" as new flags, even if they immediately follow a flag that takes a value.
         * For example:
         * 
         * "taco create path --template --kit 4.0.0-Kit"
         * 
         * If both "template" and "kit" flags are defined as strings in knownOptions of nopt, then nopt would parse the above line as follows:
         * 
         * parsedArgs = { "template": "--kit", "argv": { "remain": [ "path", "4.0.0-Kit" ] } }
         * 
         * Notice how "--kit" gets consumed as "--template"'s value, even though it should be a new flag. This method instead parses the above command as follows:
         * 
         * parsedArgs = { "template": undefined, "kit": "4.0.0-Kit", "argv": { "remain": [ "path" ] } }
         * 
         * @param {Nopt.FlagTypeMap} the map of known options
         * @param {Nopt.ShortFlags} the known shorthands for the options
         * @param {string[]} the arguments to parse
         * @param {number} the amount of args to slice from the beginning of the the knownOptions array
         *
         * @returns {Nopt.OptionsParsed} the nopt parsed object
         */
        public static parseArguments(knownOptions: Nopt.FlagTypeMap, shortHands?: Nopt.ShortFlags, args?: string[], slice?: number): commands.Commands.ICommandData {
            var undefinedToken: string = "$TACO_CLI_UNDEFINED_TOKEN$";
            var argsClone: string[];

            if (args) {
                // Clone args so we don't modify the caller's args array
                argsClone = args.slice(0);

                // Look for consecutive entries that start with "-" and insert an undefinedToken between them
                var i: number = 0;
                while (i < argsClone.length - 1) {
                    if (argsClone[i][0] === "-" && argsClone[i + 1][0] === "-") {
                        argsClone.splice(i + 1, 0, undefinedToken);
                    }

                    ++i;
                }
            }

            // Parse args with nopt
            var noptParsed: Nopt.OptionsParsed = nopt(knownOptions, shortHands, argsClone ? argsClone : args, slice);

            // Create the IParsedCommand object
            var parsed: commands.Commands.ICommandData = { original: [], remain: [], options: {} };

            for (var property in noptParsed) {
                // Determine whether property is a flag
                if (noptParsed.hasOwnProperty(property) && property !== "argv") {
                    // This is one of the parsed flags, so add it to our object
                    parsed.options[property] = noptParsed[property];

                    // If the value is the undefined token, set it to a null value so we can detect that no argument was provided
                    if (parsed.options[property] === undefinedToken) {
                        parsed.options[property] = null;
                    }
                }
            }

            // Assign original and remain to our IParsedCommand object, while cleaning any undefined tokens that are left
            function filterFunc(element: any): boolean {
                return element !== undefinedToken;
            }

            parsed.original = noptParsed.argv.original.filter(filterFunc);
            parsed.remain = noptParsed.argv.remain.filter(filterFunc);

            return parsed;
        }
    }
}

export = TacoUtility;
