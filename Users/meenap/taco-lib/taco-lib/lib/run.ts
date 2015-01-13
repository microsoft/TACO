/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import cordova = require('cordova');
import fs = require('fs');
import path = require('path');
import Q = require('q');


cordova.on('results', console.info);
cordova.on('log', console.info);
cordova.on('warn', console.warn);
cordova.on('error', console.error);
cordova.on('verbose', console.info);


module run {
    export function runProject(options: any): Q.Promise<any> {
        return cordova.raw.run(options);
    }

    export function emulateProject(options: any): Q.Promise<any> {
        return cordova.raw.emulate(options);
    }
}

export = run;