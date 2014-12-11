/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import child_process = require('child_process');
import fs = require('fs');
import path = require('path');

class BuildLogger {
    stream: fs.WriteStream;

    constructor() {
        this.stream = null;
    }

    begin(buildDir: string, logFileName: string, buildProcess: child_process.ChildProcess): void {
        var pathToBuildLog = path.join(buildDir, logFileName);
        this.stream = fs.createWriteStream(pathToBuildLog);
        this.stream.on('error', function (err) {

        });
        var me = this;
        buildProcess.stdout.on('data', function (data) {
            me.log(data);
        });
        buildProcess.stderr.on('data', function (data) {
            me.log(data);
        });
    }

    end(): void {
        if (this.stream !== null) {
            this.stream.end();
        }
        this.stream = null;
    }

    log(message: string) {
        this.stream.write(message);
    }
}

export = BuildLogger;