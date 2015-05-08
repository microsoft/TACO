/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../typings/nconf.d.ts" />
/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/tacoUtils.d.ts" />
"use strict";

import child_process = require ("child_process");
import fs = require ("fs");
import path = require ("path");

import resources = require ("./resources/resourceManager");

module TacoUtility {
    export class ProcessLogger {
        private _stream: fs.WriteStream;

        constructor() {
            this._stream = null;
        }

        /**
         * Begin logging stdout and stderr of a process to a log file
         *
         * @param {string} logDir Directory to put the log in
         * @param {string} logFileName File name of the log file
         * @param {string} language Language to localize messages about the logging in
         * @param {ChildProcess} proc The process to log
         */
        public begin(logDir: string, logFileName: string, language: string, proc: child_process.ChildProcess): void {
            var pathToLog = path.join(logDir, logFileName);
            this._stream = fs.createWriteStream(pathToLog);
            this._stream.on("error", function (err: any): void {
                console.error(resources.getStringForLanguage(language, "ProcessLogError"), pathToLog, err);
            });
            var me = this;
            proc.stdout.on("data", function (data: any): void {
                me.log(data);
            });
            proc.stderr.on("data", function (data: any): void {
                me.log(data);
            });
            proc.on("exit", function (code: number): void {
                if (code) {
                    me.log(resources.getStringForLanguage(language, "LoggedProcessTerminatedWithCode", code));
                }

                me.end();
            });
        }

        /**
         * Stop logging to a file
         */
        public end(): void {
            if (this._stream) {
                this._stream.end();
            }

            this._stream = null;
        }

        private log(message: string): void {
            if (this._stream) {
                this._stream.write(message);
            }
        }
    }
}

export = TacoUtility;
