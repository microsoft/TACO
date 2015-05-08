/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/nconf.d.ts" />
/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/tacoUtils.d.ts" />
declare module TacoUtility {
    class ProcessLogger {
        private _stream;
        constructor();
        /**
         * Begin logging stdout and stderr of a process to a log file
         *
         * @param {string} logDir Directory to put the log in
         * @param {string} logFileName File name of the log file
         * @param {string} language Language to localize messages about the logging in
         * @param {ChildProcess} proc The process to log
         */
        begin(logDir: string, logFileName: string, language: string, proc: NodeJSChildProcess.ChildProcess): void;
        /**
         * Stop logging to a file
         */
        end(): void;
        private log(message);
    }
}
