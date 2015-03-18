/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/Q.d.ts" />
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
         * @param {any} the map of known options
         * @param {any} the known shorthands for the options
         * @param {string[]} the arguments to parse
         * @param {number} the amount of args to slice from the beginning of the the knownOptions array
         *
         * @returns {any} Returns the nopt parsed object directly
         */
        public static parseArguments(knownOptions: any, shortHands?: any, args?: string[], slice?: number): any {
            var argsToParse: any = args;

            if (!argsToParse) {
                return;
            }

            var undefinedToken: string = "$TACO_CLI_UNDEFINED_TOKEN$";
            var doneParsing: boolean = false;
            var parsedOpts: any;
            var savedArgv: any;

            // Parse the arguments over several iterations, because if flagB was originally consumed as flagA's value, then flagB's value would be dumped into 
            // argv.remain, so after we move flagB to the flags we need to reparse the arguments to properly assign flagB's value
            while (!doneParsing) {
                parsedOpts = nopt(knownOptions, shortHands, argsToParse, slice);

                // The first time we parse the args, save the resulting argv object so that we can later restore it to avoid polluting the results with our tokens
                if (!savedArgv) {
                    // We want to clone (deep copy) the argument arrays; we use slice for that
                    savedArgv = {};
                    savedArgv.original = parsedOpts.argv.original.slice(0);
                    savedArgv.cooked = parsedOpts.argv.cooked.slice(0);
                }

                // Iterate through found flags and insert an undefined token after flags that have another flag as a value
                var mustReparse: boolean = false;

                for (var property in parsedOpts) {
                    // Determine whether property is a flag
                    if (parsedOpts.hasOwnProperty(property) && property !== "argv") {
                        // This is one of the parsed flags; check if its value starts with --
                        if (typeof parsedOpts[property] === "string" && parsedOpts[property].indexOf("--") === 0) {
                            // This flag has a value starting with "--", so insert an undefined token in the original args after the current flag it; it 
                            // might have been entered as an abbreviation, so find the index of the abbreviation if necessary
                            var flagIndex: number = -1;
                            var flagName: string = property;

                            while (flagIndex === -1) {
                                // If flagName wasn't found, shorten the flag name by 1 character and try again until the abbreviated flag is found
                                flagIndex = argsToParse.indexOf("--" + flagName);
                                flagName = flagName.substr(0, flagName.length - 1);
                            }

                            // Add the undefined token after the matched flag
                            argsToParse.splice(flagIndex + 1, 0, undefinedToken);
                            mustReparse = true;
                        }
                    }
                }

                doneParsing = !mustReparse;
            }

            // Replace undefined tokens with the actual undefined value
            for (var property in parsedOpts) {
                // Determine whether property is a flag
                if (parsedOpts.hasOwnProperty(property) && property !== "argv") {
                    // This is one of the parsed flags; check if it has the undefined token as a value
                    if (parsedOpts[property] === undefinedToken) {
                        // Set the value to undefined
                        parsedOpts[property] = undefined;
                    }
                }
            }

            // Make sure we don't pollute the original and cooked arg arrays with our tokens
            parsedOpts.argv.original = savedArgv.original;
            parsedOpts.argv.cooked = savedArgv.cooked;
            return parsedOpts;
        }
    }
}

export = TacoUtility;