/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import fs = require('fs');
import path = require('path');
import Q = require('q');
import res = require('./resources');
import mkdirp = require('mkdirp');
import request = require('request');

var settings;

export function init(newSettings) {
    settings = newSettings;
}

// Recursively creates directory structure if it does not exist. Handles a directory chain, e.g if bin does not yet exist in 'bin/Windows/Debug' it will make all 3 directories
export function createDirectoryIfNecessary (dir: string, _fs = fs) {
    if (!_fs.existsSync(dir)) {
        try {
            console.info(res.getString('CreatingDirectory', dir));
            mkdirp.sync(dir);
        } catch (err) {
            // if multiple msbuild processes are running on a first time solution build, another one might have created the basedir. check again.
            if (!_fs.existsSync(dir)) {
                throw err;
            }
        }
    }
}

export function copyFileContentsSync(source : string, target: string) {
    try {
        if (fs.existsSync(source)) {
            createDirectoryIfNecessary(path.dirname(target));
            fs.writeFileSync(target, fs.readFileSync(source));
            console.info(res.getString('CopiedFromTo', source, target));
        } else {
            console.info(res.getString('CopyFailedFileNotFound', source));
        }
    } catch (e) {
        console.info(res.getString('ErrorCopyingFromTo', source, target, e.message));
    }
}

export function promiseForHttpGet(urlOrRequestOptions): Q.IPromise<{ response: any; body: string }> {
    var deferred = Q.defer();
    request.get(urlOrRequestOptions, function (error, response, body) {
        if (error) {
            deferred.reject(new Error('Error from http get ' + urlOrRequestOptions + ': ' + error));
        } else {
            deferred.resolve({ response: response, body: body });
        }
    });
    return deferred.promise;
}