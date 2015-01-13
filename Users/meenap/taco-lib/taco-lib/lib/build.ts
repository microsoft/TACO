/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import child_process = require('child_process');
import cordova = require('cordova');
import fs = require('fs');
import path = require('path');
import Q = require('q');





module build {

    cordova.on('results', console.info);
    cordova.on('log', console.info);
    cordova.on('warn', console.warn);
    cordova.on('error', console.error);
    cordova.on('verbose', console.info);

    cordova.on('before_prepare', beforePrepare);
    cordova.on('after_compile', afterCompile);

    export function beforePrepare(data) {
        // Instead of a build, we call prepare and then compile
        // trigger the before_build in case users expect it
        cordova.emit('before_build', data);
    }

    export function afterCompile(data) {
        // Instead of a build, we call prepare and then compile
        // trigger the after_build in case users expect it
        cordova.emit('after_build', data);
    }
    export function buildProject(options: any): Q.Promise<any> {
        return cordova.raw.build(options);
    }

    export function compileProject(options: any): Q.Promise<any> {
        return cordova.raw.compile(options);
    }

    export function prepareProject(options: any): Q.Promise<any> {
        return cordova.raw.prepare(options);
    }
}

export = build;
