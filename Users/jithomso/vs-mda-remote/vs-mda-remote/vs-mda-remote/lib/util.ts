/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import fs = require('fs');
import mkdirp = require('mkdirp');
import ncp = require('ncp');
import path = require('path');
import Q = require('q');


module Util {
    export function createDirectoryIfNecessary(dir: string) : boolean {
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
    };

    export function readFileContentsSync(filename: string, encoding?: string) : string{
        var contents = fs.readFileSync(filename, (encoding || 'utf-8'));
        if (contents) {
            contents = contents.replace(/^\uFEFF/, ''); //Windows is the BOM
        }
        return contents;
    };

    export function copyFile(from: string, to: string, encoding?: string): Q.Promise<{}> {
        var deferred = Q.defer();
        var newFile = fs.createWriteStream(to, { encoding: encoding });
        var oldFile = fs.createReadStream(from, { encoding: encoding });
        oldFile.on('finish', function () {
            deferred.resolve({});
        });
        oldFile.pipe(newFile);
        return deferred.promise;
    /*
        // The original code here stripped out byte order markers (but also potentially mangle binary files)
        var contents = readFileContentsSync(from, encoding);
        fs.writeFileSync(to, contents, { encoding: encoding });
*/
    }

    export function argToBool(input: any): boolean {
        if (typeof input === 'string') {
            return input.toLowerCase() === 'true';
        }
        return !!input;
    }

    export function getOptionalArgsArrayFromFunctionCall(functionArguments: IArguments, startFrom: number): any[] {
        if (functionArguments.length <= startFrom) {
            return null;
        }
        if (Array.isArray(functionArguments[startFrom])) {
            return functionArguments[startFrom];
        }
        return Array.prototype.slice.apply(functionArguments, [startFrom]);
    }

    var invalidAppNameChars = {
        34: '"',
        36: '$',
        38: '&',
        39: '/',
        60: '<',
        92: '\\'
    };

    export function isValidCordovaAppName(str: string) : boolean{
        for (var i = 0, n = str.length; i < n; i++) {
            var code = str.charCodeAt(i);
            if (code < 32 || invalidAppNameChars[code]) {
                return false;
            }
        }
        return true;
    }

    export function invalidAppNameCharacters() : string[] {
        var x = [];
        Object.keys(invalidAppNameChars).forEach(function (c) {
            x.push(invalidAppNameChars[c]);
        });
        return x;
    };

    // Recursively copy 'source' to 'target'
    export function copyRecursive(source: string, target: string) {
        var deferred = Q.defer();
        var options = {};
        
        ncp.ncp(source, target, options, function (error) {
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve({});
            }
        });

        return deferred.promise;
    };

    export function quotesAroundIfNecessary(filename: string) : string {
        return (filename.indexOf(' ') > -1) ? '"' + filename + '"' : filename;
    }
}

export = Util;