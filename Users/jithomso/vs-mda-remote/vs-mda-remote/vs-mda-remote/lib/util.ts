/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import fs = require('fs');
import path = require('path');
import mkdirp = require('mkdirp');

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

    export function copyFileSync(from: string, to: string, encoding?: string): void {
        var contents = readFileContentsSync(from, encoding);
        fs.writeFileSync(to, contents, { encoding: encoding });
    }

    export function argToBool(input: any): boolean {
        if (typeof input === 'string') {
            return input.toLowerCase() === 'true';
        }
        return !!input;
    }
}

export = Util;