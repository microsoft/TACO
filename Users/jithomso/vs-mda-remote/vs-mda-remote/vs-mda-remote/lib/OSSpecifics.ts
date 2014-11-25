/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import os = require('os');
import Q = require('q');

module OsSpecifics {
    export interface Conf {
        get(key: string): any
    }
    export interface IOsSpecifics {
        defaults(base: any): any;
        initialize(): Q.IPromise<any>;
        printUsage(language: string): void;
        resetServerCert(conf: Conf): Q.IPromise<any>;
        generateClientCert(conf: Conf): Q.IPromise<any>;
    }

    export var osSpecifics: IOsSpecifics ;
    if (osSpecifics === undefined) {
        var platform: string = os.platform();
        osSpecifics = require(platform + "_specifics");
    }
}

export = OsSpecifics;