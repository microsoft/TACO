/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/mkdirp.d.ts" />
/// <reference path="../typings/ncp.d.ts" />
/// <reference path="../typings/tacoHelpArgs.d.ts"/>

declare module TacoUtility {
    class UtilHelper {
        private static INVALID_APP_NAME_CHARS;

        static tacoHome: string;
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
        public static copyRecursive(source: string, target: string, options?: ICopyOptions): Q.Promise<any>;
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
        public static loggedExec(command: string, options: NodeJSChildProcess.IExecOptions, callback: (error: Error, stdout: Buffer, stderr: Buffer) => void): NodeJSChildProcess.ChildProcess;
        /**
         * Returns a string where the %...% notations in the provided string have been replaced with their actual values. For example, calling this with "%programfiles%\foo"
         * would return "C:\Program Files\foo" (on most systems). Values that don't exist are not replaced.
         *
         * @param {string} str The string for which to expand environment variables
         *
         * @return {string} A new string where the environment variables were replaced with their actual value
         */
        public static cleanseOptions(options: { [option: string]: any }, exclude: string[]): { [option: string]: any };

        public static expandEnvironmentVariables(str: string): string;

        /**
         * Validates the given path, ensuring all segments are valid directory / file names
         *
         * @param {string} pathToTest The path to validate
         *
         * @return {boolean} A boolean set to true if the path is valid, false if not
         */
        public static isPathValid(pathToTest: string): boolean;

        /**
         * Returns true if version was requested in args, false otherswise
         */
        public static tryParseVersionArgs(args: string[]): boolean;

        /**
         * Returns ITacoHelpArgs with a requested helpTopic if help was requested in given args
         * Returns null otherwise
         */
        public static tryParseHelpArgs(args: string[]): ITacoHelpArgs;

        /**
         * parses a JSON file which could get modified by user or another tool
         * handles different encoding
         * @param {string} path to the json file
         * @return {any} parsed JSON object
         */
        public static parseUserJSON(filepath: string): any;
        /**
         * Sets the global LogLevel setting for TACO by specifically looking for the "--loglevel" string. If found, and the string after it is a valid loglevel value, the global config's loglevel
         * is set. Finally, the "--loglevel" string (and the following value, if present, whether it is valid or not) are removed from the args so that they are not passed to the command.
         *
         * @param {string[]} args The command line args to parse in order to find the --loglevel parameter
         * @return {string[]} The args where --loglevel and its value have been removed
         */
        public static initializeLogLevel(args: string[]): string[];
        /**
         * Sets the global acceptPrompts setting for TACO by specifically looking for the "--accept" string in the given command args. If found, the "--accept" string is removed from the args so that
         * it is not passed to the command.
         *
         * @param {string[]} args The command line args to parse in order to find the --loglevel parameter
         * @return {string[]} The args where --loglevel and its value have been removed
         */
        public static initializeAcceptPrompts(args: string[]): string[];
        /**
         * An explicit helper empty method, which can be used in scenarios like
         * silent callbacks, catch all exceptions do nothing etc.
         */
        public static emptyMethod(args?: any): any;
    }

    interface ICopyOptions {
        clobber?: boolean;
        filter?: (itemPath: string) => boolean;
    }
}
