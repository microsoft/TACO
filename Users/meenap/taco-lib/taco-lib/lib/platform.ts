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

module platform {
    export function platformCommand(command: string, targets: string, options: any): Q.IPromise<any> {
        switch (command) {
            case 'add':
                return cordova.raw.platform('add', targets, options);
                break;
            case 'rm':
            case 'remove':
                return cordova.raw.platform('remove', targets, options);
                break;
            case 'update':
            case 'up':
                return cordova.raw.platform('update', targets, options);
                break;
            case 'check':
                return cordova.raw.platform('check', targets, options);
                break;
            default:
                return cordova.raw.platform('list');
        }
    }
}

export = platform;

