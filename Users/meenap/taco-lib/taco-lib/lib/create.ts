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


cordova.on('results', console.info);
cordova.on('log', console.info);
cordova.on('warn', console.warn);
cordova.on('error', console.error);
cordova.on('verbose', console.info);


module create {
    export function createProject(dir: string, id: string, name: string, cfg: string): Q.Promise<any> {
        return cordova.raw.create(dir, id, name, cfg);
    }
}

export = create;