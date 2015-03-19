/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/nopt.d.ts" />
import fs = require("fs");
import Q = require("q");
import nopt = require("nopt");

module TacoUtility {
    export class UtilHelper {
        private static InvalidAppNameChars = {
            34: "\"",
            36: "$",
            38: "&",
            39: "/",
            60: "<",
            92: "\\"
        };
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

        public static readFileContentsSync(filename: string, encoding?: string): string {
            var contents = fs.readFileSync(filename, (encoding || "utf-8"));
            if (contents) {
                contents = contents.replace(/^\uFEFF/, ""); // Windows is the BOM
            }

            return contents;
        }

        public static copyFile(from: string, to: string, encoding?: string): Q.Promise<any> {
            var deferred = Q.defer();
            var newFile = fs.createWriteStream(to, { encoding: encoding });
            var oldFile = fs.createReadStream(from, { encoding: encoding });
            newFile.on("finish", function (): void {
                deferred.resolve({});
            });
            newFile.on("error", function (e: any): void {
                deferred.reject(e);
            });
            oldFile.on("error", function (e: any): void {
                deferred.reject(e);
            });
            oldFile.pipe(newFile);
            return deferred.promise;
            /*
                // The original code here stripped out byte order markers (but also potentially mangle binary files)
                var contents = readFileContentsSync(from, encoding);
                fs.writeFileSync(to, contents, { encoding: encoding });
        */
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
        public static parseArguments(knownOptions: Nopt.FlagTypeMap, shortHands?: Nopt.ShortFlags, args?: string[], slice?: number): Nopt.OptionsParsed {
            var undefinedToken: string = "$TACO_CLI_UNDEFINED_TOKEN$";
            var argsClone: string[];

            if (args) {
                // Clone args so we don't modify the caller's args array
                argsClone = args.slice(0);

                // Look for consecutive entries that start with "--" and insert an undefinedToken between them
                var i: number = 0;
                while (i < argsClone.length - 1) {
                    if (argsClone[i].indexOf("--") === 0 && argsClone[i + 1].indexOf("--") === 0) {
                        argsClone.splice(i + 1, 0, undefinedToken);
                    }
                    ++i;
                }
            }

            // Parse args with nopt
            var parsedOptions: Nopt.OptionsParsed = nopt(knownOptions, shortHands, argsClone ? argsClone : args, slice);

            // Replace the value for flags that have the undefined token with the actual undefined value
            for (var property in parsedOptions) {
                // Determine whether property is a flag
                if (parsedOptions.hasOwnProperty(property) && property !== "argv") {
                    // This is one of the parsed flags; check if it has the undefined token as a value
                    if (parsedOptions[property] === undefinedToken) {
                        // Set the value to undefined
                        parsedOptions[property] = undefined;
                    }
                }
            }

            function filterFunc(element: any): boolean {
                return element !== undefinedToken;
            }

            // Clean up argv.original, argv.cooked and argv.remain of any remaining undefined tokens
            parsedOptions.argv.cooked = parsedOptions.argv.cooked.filter(filterFunc);
            parsedOptions.argv.original = parsedOptions.argv.original.filter(filterFunc);
            parsedOptions.argv.remain = parsedOptions.argv.remain.filter(filterFunc);

            return parsedOptions;
        }
    }
}

export = TacoUtility;