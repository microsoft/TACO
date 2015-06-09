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

declare module TacoUtility {
    class UtilHelper {
        private static InvalidAppNameChars;

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
        public static copyRecursive(source: string, target: string, options?: any): Q.Promise<any>;
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
        /**
         * Returns a string where the %...% notations in the provided string have been replaced with their actual values. For example, calling this with "%programfiles%\foo"
         * would return "C:\Program Files\foo" (on most systems). Values that don't exist are not replaced.
         *
         * @param {string} str The string for which to expand environment variables
         *
         * @return {string} A new string where the environment variables were replaced with their actual value
         */
        public static expandEnvironmentVariables(str: string): string;
    }
}
