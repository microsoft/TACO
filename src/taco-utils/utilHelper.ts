/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../typings/iconv-lite.d.ts"/>
/// <reference path="../typings/mkdirp.d.ts"/>
/// <reference path="../typings/ncp.d.ts"/>
/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/nopt.d.ts" />
/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/rimraf.d.ts"/>
/// <reference path="../typings/tacoHelpArgs.d.ts"/>

"use strict";
import child_process = require ("child_process");
import crypto = require ("crypto");
import fs = require ("fs");
import mkdirp = require ("mkdirp");
import ncp = require ("ncp");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import rimraf = require ("rimraf");
import iconv = require("iconv-lite");

import argsHelper = require ("./argsHelper");
import commands = require ("./commands");
import logger = require("./logger");
import logLevel = require ("./logLevel");
import tacoErrorCodes = require ("./tacoErrorCodes");
import errorHelper = require ("./tacoErrorHelper");
import tacoGlobalConfig = require ("./tacoGlobalConfig");

import ArgsHelper = argsHelper.ArgsHelper;
import Commands = commands.Commands;
import ICommandData = Commands.ICommandData;
import Logger = logger.Logger;
import LogLevel = logLevel.LogLevel;
import TacoErrorCodes = tacoErrorCodes.TacoErrorCode;
import TacoGlobalConfig = tacoGlobalConfig.TacoGlobalConfig;

module TacoUtility {
    export class UtilHelper {
        private static INVALID_APP_NAME_CHARS: { [key: string]: string } = {
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
         * Read the contents of a file, stripping out any byte order markers
         *
         * @param {string} filename The file to read
         * @param {string} encoding What encoding to read the file as, defaulting to utf-8
         * @return {string} The contents of the file, excluding byte order markers.
         */
        public static readFileContentsSync(filename: string, encoding?: string): string {
            var contents: string = fs.readFileSync(filename, (encoding || "utf-8"));
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
            var deferred: Q.Deferred<any> = Q.defer();
            var newFile: fs.WriteStream = fs.createWriteStream(to, { encoding: encoding });
            var oldFile: fs.ReadStream = fs.createReadStream(from, { encoding: encoding });
            newFile.on("finish", function (): void {
                deferred.resolve({});
            });
            newFile.on("error", function (e: Error): void {
                deferred.reject(errorHelper.wrap(TacoErrorCodes.FailedFileRead, e, to));
            });
            oldFile.on("error", function (e: Error): void {
                deferred.reject(errorHelper.wrap(TacoErrorCodes.FailedFileWrite, e, from));
            });
            oldFile.pipe(newFile);
            return deferred.promise;
        }

        /**
         * Recursively copy 'source' to 'target' asynchronously
         *
         * @param {string} source Location to copy from
         * @param {string} target Location to copy to
         * @returns {Q.Promise} A promise which is fulfilled when the copy completes, and is rejected on error
         */
        public static copyRecursive(source: string, target: string, options?: any): Q.Promise<any> {
            var deferred: Q.Deferred<any> = Q.defer();

            options = options ? options : {};

            ncp.ncp(source, target, options, function (error: any): void {
                if (error) {
                    deferred.reject(errorHelper.wrap(TacoErrorCodes.FailedRecursiveCopy, error, source, target));
                } else {
                    deferred.resolve({});
                }
            });

            return deferred.promise;
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
            for (var i: number = 0, n: number = str.length; i < n; i++) {
                var code: number = str.charCodeAt(i);
                if (code < 32 || UtilHelper.INVALID_APP_NAME_CHARS[code]) {
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
            return Object.keys(UtilHelper.INVALID_APP_NAME_CHARS).map(function (c: string): string {
                return UtilHelper.INVALID_APP_NAME_CHARS[c];
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
        public static loggedExec(command: string, options: NodeJSChildProcess.IExecOptions, callback: (error: Error, stdout: Buffer, stderr: Buffer) => void): child_process.ChildProcess {
            return child_process.exec(command, options, function (error: Error, stdout: Buffer, stderr: Buffer): void {
                if (error) {
                    Logger.logError(command);
                    Logger.logError(stdout.toString());
                    Logger.logError(stderr.toString());
                }

                callback(error, stdout, stderr);
            });
        }

        /**
         * Returns a string where the %...% notations in the provided string have been replaced with their actual values. For example, calling this with "%programfiles%\foo"
         * would return "C:\Program Files\foo" (on most systems). Values that don't exist are not replaced.
         *
         * @param {string} str The string for which to expand environment variables
         *
         * @return {string} A new string where the environment variables were replaced with their actual value
         */
        public static expandEnvironmentVariables(str: string): string {
            var regex: RegExp = process.platform === "win32" ? /%(.+?)%/g : /\$(.+?)(?:\/|$)/g;

            // For Mac OS, first try to detect the ~ notation at the start of the string and replace it with the HOME value
            if (os.platform() === "darwin" && process.env.HOME) {
                str = str.replace(/^~(?=\/|$)/, process.env.HOME);
            }

            return str.replace(regex, function (substring: string, ...args: any[]): string {
                if (process.env[args[0]]) {
                    var newValue: string = process.env[args[0]];

                    // For darwin platform, if the matched string ends with "/", then add a "/"
                    if (os.platform() === "darwin" && substring[substring.length - 1] === "/") {
                        newValue += "/";
                    }

                    return newValue;
                } else {
                    // This is not an environment variable, can't replace it so leave it as is
                    return substring;
                }
            });
        }

        /**
         * Validates the given path, ensuring all segments are valid directory / file names
         *
         * @param {string} pathToTest The path to validate
         *
         * @return {boolean} A boolean set to true if the path is valid, false if not
         */
        public static isPathValid(pathToTest: string): boolean {
            // If path is a network location ("\\...") or starts with "\\?\" notation, it is not a valid path for the purposes of this CLI
            if (pathToTest.indexOf("\\\\") === 0) {
                return false;
            }

            // Set up test folder
            var tmpDir: string = os.tmpdir();
            var testDir: string = crypto.pseudoRandomBytes(20).toString("hex");

            while (fs.existsSync(path.join(tmpDir, testDir))) {
                testDir = crypto.pseudoRandomBytes(20).toString("hex");
            }

            // Test each segment of the path
            var currentPath: string = path.join(tmpDir, testDir);
            var hasInvalidSegments: boolean;

            fs.mkdirSync(currentPath);
            hasInvalidSegments = pathToTest.split(path.sep).some(function (segment: string, index: number): boolean {
                // Exceptions for Windows platform for the very first segment: skip drive letter
                if (index === 0 && os.platform() === "win32" && /^[a-zA-Z]:$/.test(segment)) {
                    return false;
                }

                try {
                    var nextPath: string = path.join(currentPath, segment);

                    fs.mkdirSync(nextPath);
                    currentPath = nextPath;
                } catch (err) {
                    // If we catch an ENOENT, it means the segment is an invalid filename. For any other exception, we can't be sure, so we try to be permissive.
                    if (err.code === "ENOENT") {
                        return true;
                    }
                }

                return false;
            });

            // Attempt to delete our test folders, but don't throw if it doesn't work
            rimraf(currentPath, UtilHelper.emptyMethod);

            // Return the result
            return !hasInvalidSegments;
        }

        /**
         * Returns true if version was requested in args, false otherwise
         */
        public static tryParseVersionArgs(args: string[]): boolean {
            return args.some(function (value: string): boolean { return /^(-*)(v|version)$/.test(value); });
        }

        /**
         * Returns ITacoHelpArgs with a requested helpTopic if help was requested in given args
         * Returns null otherwise
         */
        public static tryParseHelpArgs(args: string[]): ITacoHelpArgs {
            // if help flag is specified, use that
            // for "taco --help cmd" scenarios, update commandArgs to reflect the next argument or make it [] if it is not present
            // for "taco cmd --help" scenarios, update commandArgs to reflect the first argument instead
            for (var i: number = 0; i < args.length; i++) {
                if (/^(-*)(h|help)$/.test(args[i])) {
                    return <ITacoHelpArgs> { helpTopic: (i === 0) ? (args[1] ? args[1] : "") : args[0] };
                }
            }

            return null;
        }

        /**
         * parses a JSON file which could get modified by user or another tool
         * handles different encoding
         * @param {string} path to the json file
         * @return {any} parsed JSON object
         */
        public static parseUserJSON(filePath: string): any {
            if (fs.existsSync(filePath)) {
                var contents: Buffer = fs.readFileSync(filePath);
                // try the simplest path first
                try {
                    return JSON.parse(contents.toString());
                } catch (ex) {
                    UtilHelper.emptyMethod();
                }

                // may be this is a UTF-8 with BOM
                try {
                    return JSON.parse(iconv.decode(contents, "utf8"));
                } catch (ex) {
                    UtilHelper.emptyMethod();
                }
                // May be this is a UTF-16 file
                try {
                    return JSON.parse(iconv.decode(contents, "utf16"));
                } catch (ex) {
                    UtilHelper.emptyMethod();
                }
            }

            throw errorHelper.get(tacoErrorCodes.TacoErrorCode.ErrorUserJsonMissingOrMalformed, filePath);
        }

        /**
         * Sets the global LogLevel setting for TACO by specifically looking for the "--loglevel" string. If found, and the string after it is a valid loglevel value, the global config's loglevel
         * is set. Finally, the "--loglevel" string (and the following value, if present, whether it is valid or not) are removed from the args so that they are not passed to the command.
         *
         * @param {string[]} args The command line args to parse in order to find the --loglevel parameter
         * @return {string[]} The args where --loglevel and its value have been removed
         */
        public static initializeLogLevel(args: string[]): string[] {
            if (!args) {
                return args;
            }

            // Note: Not using nopt to look for "--loglevel", because the autocmplete feature would catch things like "-l", when these may be intended for the command itself (not for taco loglevel).
            var logLevelTag: string = "--loglevel";
            var logLevelTagIndex: number = args.indexOf(logLevelTag);

            if (logLevelTagIndex === -1) {
                return args;
            }

            var logLevelValueIndex: number = logLevelTagIndex + 1;

            if (logLevelValueIndex <= args.length - 1 && args[logLevelValueIndex].indexOf("--") === -1) {
                // We have a --loglevel tag and we have a value; validate the specified value
                var logLevelString: string = args[logLevelValueIndex].charAt(0).toUpperCase() + args[logLevelValueIndex].toLowerCase().substr(1);

                // If we understand the provided log level value, convert the string value to the actual enum value and save it in the global settings
                if (LogLevel.hasOwnProperty(logLevelString)) {
                    TacoGlobalConfig.logLevel = (<any> LogLevel)[logLevelString];
                }
            } else {
                // We don't have a log level value; set its index to -1
                logLevelValueIndex = -1;
            }

            // Clean up the --loglevel tag and its value, if present, from the args
            args.splice(logLevelTagIndex, 1 + (logLevelValueIndex === -1 ? 0 : 1));

            return args;
        }

        /* tslint:disable:no-empty */
        /**
         * An explicit helper empty method, which can be used in scenarios like
         * silent callbacks, catch all exceptions do nothing etc.
         */
        public static emptyMethod(...args: any[]): void {
        }
        /* tslint:enable:no-empty */

    }
}

export = TacoUtility;
