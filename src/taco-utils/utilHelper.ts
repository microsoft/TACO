/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/nopt.d.ts" />
/// <reference path="../typings/mkdirp.d.ts"/>
/// <reference path="../typings/ncp.d.ts"/>

"use strict";
import child_process = require ("child_process");
import fs = require ("fs");
import mkdirp = require ("mkdirp");
import ncp = require ("ncp");
import nopt = require ("nopt");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import commands = require ("./commands");

module TacoUtility {
    export class UtilHelper {
        private static InvalidAppNameChars: { [key: string]: string } = {
            34: "\"",
            36: "$",
            38: "&",
            39: "/",
            60: "<",
            92: "\\"
        };

        public static get tacoHome(): string {
            if (process.env["TACO_HOME"]) {
                return process.env["TACO_HOME"];
            }

            switch (os.platform()) {
                case "win32":
                    return path.join(process.env["APPDATA"], "taco_home");
                case "darwin":
                case "linux":
                    return path.join(process.env["HOME"], ".taco_home");
                default:
                    throw new Error("UnexpectedPlatform");
            };
        }

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
         * Read the contents of a file, stripping out any byte order markers
         *
         * @param {string} filename The file to read
         * @param {string} encoding What encoding to read the file as, defaulting to utf-8
         * @return {string} The contents of the file, excluding byte order markers.
         */
        public static readFileContentsSync(filename: string, encoding?: string): string {
            var contents = fs.readFileSync(filename, (encoding || "utf-8"));
            if (contents) {
                contents = contents.replace(/^\uFEFF/, ""); // Windows is the BOM
            }

            return contents;
        }

        /**
         * Asynchronously copy a file
         * 
         * @param {string} from Location to copy from
         * @param {string} to Location to copy to
         * @param {string} encoding Encoding to use when reading and writing files
         * @returns {Q.Promise} A promise which is fulfilled when the file finishes copying, and is rejected on any error condition.
         */
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
         * Recursively copy 'source' to 'target' asynchronously
         *
         * @param {string} source Location to copy from
         * @param {string} target Location to copy to
         * @returns {Q.Promise} A promise which is fulfilled when the copy completes, and is rejected on error
         */
        public static copyRecursive(source: string, target: string, options?: any): Q.Promise<any> {
            var deferred = Q.defer();

            options = options ? options : {};

            ncp.ncp(source, target, options, function (error: any): void {
                if (error) {
                    deferred.reject(error);
                } else {
                    deferred.resolve({});
                }
            });

            return deferred.promise;
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

        /**
         * Synchronously create a directory if it does not exist
         * 
         * @param {string} dir The directory to create
         *
         * @returns {boolean} If the directory needed to be created then returns true, otherwise returns false. If the directory could not be created, then throws an exception.
         */
        public static createDirectoryIfNecessary(dir: string): boolean {
            if (!fs.existsSync(dir)) {
                try {
                    mkdirp.sync(dir);
                    return true;
                } catch (err) {
                    // if multiple msbuild processes are running on a first time solution build, another one might have created the basedir. check again.
                    if (!fs.existsSync(dir)) {
                        throw err;
                    }
                }
            }

            return false;
        }

        /**
         * Determine whether a string contains characters forbidden in a Cordova display name
         *
         * @param {string} str The string to check
         * @return {boolean} true if the display name is acceptable, false otherwise
         */
        public static isValidCordovaAppName(str: string): boolean {
            for (var i = 0, n = str.length; i < n; i++) {
                var code = str.charCodeAt(i);
                if (code < 32 || UtilHelper.InvalidAppNameChars[code]) {
                    return false;
                }
            }

            return true;
        }

        /**
         * Return a list of characters which must not appear in an app's display name
         *
         * @return {string[]} The forbidden characters
         */
        public static invalidAppNameCharacters(): string[] {
            return Object.keys(UtilHelper.InvalidAppNameChars).map(function (c: string): string {
                return UtilHelper.InvalidAppNameChars[c];
            });
        }

        /**
         * Surround a string with double quotes if it contains spaces.
         *
         * @param {string} input The string to make safer
         * @returns {string} Either the input string unchanged, or the input string surrounded by double quotes and with any initial double quotes escaped
         */
        public static quotesAroundIfNecessary(input: string): string {
            return (input.indexOf(" ") > -1) ? "\"" + input.replace(/"/g, "\\\"") + "\"" : input;
        }

        /**
         * Call exec and log the child process' stdout and stderr to stdout on failure
         */
        public static loggedExec(command: string, options: NodeJSChildProcess.IExecOptions, callback: (error: Error, stdout: Buffer, stderr: Buffer) => void): void {
            child_process.exec(command, options, function (error: Error, stdout: Buffer, stderr: Buffer): void {
                if (error) {
                    console.error(command);
                    console.error(stdout);
                    console.error(stderr);
                }

                callback(error, stdout, stderr);
            });
        }

        /**
         * Returns a new options dictionary that contains options from the specified dictionary minus the options whose names are in the specified exclusion list
         *
         * @param {[option: string]: any} Options dictionary to be cleansed
         * @param {string[]} Options to exclude from the specified options dictionary
         *
         * @return {[option: string]: any } A new options dictionary containing the cleansed options
         */
        public static cleanseOptions(options: { [option: string]: any }, exclude: string[]): { [option: string]: any } {
            var cleansed: { [option: string]: any } = {};
            
            for (var opt in options) {
                if (!exclude || exclude.indexOf(opt) < 0) {
                    cleansed[opt] = options[opt];
                }
            }

            return cleansed;
        }
    }
}

export = TacoUtility;