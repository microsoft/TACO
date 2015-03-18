/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/nopt.d.ts" />
/// <reference path="../typings/mkdirp.d.ts" />
/// <reference path="../typings/ncp.d.ts" />
declare module TacoUtility {
    interface IParsedCommand {
        original: string[];
        remain: string[];
        options: IOptions;
    }
    interface IOptions {
        [index: string]: any;
    }

    class UtilHelper {
        private static InvalidAppNameChars;

        static tacoHome: string;
        /**
         * Converts an untyped argument into a boolean in a "sensible" way, treating only the string "true" as true rather than any non-empty string
         *
         * @param {any} input Any object that we want to determine its truthiness
         *
         * @return {boolean} For strings, this is whether the string is case-insensitively equal to "true", otherwise it is javascript's interpretation of truthiness
         */
        static argToBool(input: any): boolean;
        /**
         * Read the contents of a file, stripping out any byte order markers
         *
         * @param {string} filename The file to read
         * @param {string} encoding What encoding to read the file as, defaulting to utf-8
         * @return {string} The contents of the file, excluding byte order markers.
         */
        static readFileContentsSync(filename: string, encoding?: string): string;
        /**
         * Asynchronously copy a file
         *
         * @param {string} from Location to copy from
         * @param {string} to Location to copy to
         * @param {string} encoding Encoding to use when reading and writing files
         * @returns {Q.Promise} A promise which is fulfilled when the file finishes copying, and is rejected on any error condition.
         */
        static copyFile(from: string, to: string, encoding?: string): Q.Promise<any>;
        /**
         * Recursively copy 'source' to 'target' asynchronously
         *
         * @param {string} source Location to copy from
         * @param {string} target Location to copy to
         * @returns {Q.Promise} A promise which is fulfilled when the copy completes, and is rejected on error
         */
        static copyRecursive(source: string, target: string): Q.Promise<any>;
        /**
         * Extract optional arguments from an arguments array.
         *
         * @param {IArguments} functionArguments The "arguments" from another function
         * @param {number} startFrom The offset where the optional arguments begin
         *
         * @returns {any[]} If functionArguments[startFrom] is an array, then that is returned. Otherwise the functionArguments array except for the first startFrom elements.
         */
        static getOptionalArgsArrayFromFunctionCall(functionArguments: IArguments, startFrom: number): any[];
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
        static parseArguments(knownOptions: Nopt.FlagTypeMap, shortHands?: Nopt.ShortFlags, args?: string[], slice?: number): IParsedCommand;
        /**
         * Synchronously create a directory if it does not exist
         *
         * @param {string} dir The directory to create
         *
         * @returns {boolean} If the directory needed to be created then returns true, otherwise returns false. If the directory could not be created, then throws an exception.
         */
        static createDirectoryIfNecessary(dir: string): boolean;
        /**
         * Determine whether a string contains characters forbidden in a Cordova display name
         *
         * @param {string} str The string to check
         * @return {boolean} true if the display name is acceptable, false otherwise
         */
        static isValidCordovaAppName(str: string): boolean;
        /**
         * Return a list of characters which must not appear in an app's display name
         *
         * @return {string[]} The forbidden characters
         */
        static invalidAppNameCharacters(): string[];
        /**
         * Surround a string with double quotes if it contains spaces.
         *
         * @param {string} input The filename to make safer
         * @returns {string} Either the input string unchanged, or the input string surrounded by double quotes and with any initial double quotes escaped
         */
        static quotesAroundIfNecessary(input: string): string;
        /**
         * Call exec and log the child process' stdout and stderr to stdout on failure
         */
        public static loggedExec(command: string, options: NodeJSChildProcess.IExecOptions, callback: (error: Error, stdout: Buffer, stderr: Buffer) => void): void;
    }
}
