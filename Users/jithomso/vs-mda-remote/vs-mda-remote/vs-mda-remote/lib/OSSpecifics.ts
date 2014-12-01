/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import child_process = require('child_process');
import express = require('express');
import os = require('os');
import Q = require('q');

import bi = require('./buildInfo');

module OsSpecifics {
    export interface Conf {
        get(key: string): any
    }
    export interface IOsSpecifics {
        defaults(base: any): any;
        initialize(): Q.Promise<any>;
        printUsage(language: string): void;

        resetServerCert(conf: Conf): Q.Promise<any>;
        generateClientCert(conf: Conf): Q.Promise<number>
        initializeServerCerts(conf: Conf): Q.Promise<any>;
        removeAllCertsSync(conf: Conf): void;

        createBuildProcess(): child_process.ChildProcess;

        downloadBuild(buildInfo: bi.BuildInfo, request: express.Request, response: express.Response, callback: Function): void;
    }

    export var osSpecifics: IOsSpecifics ;
    if (osSpecifics === undefined) {
        var platform: string = os.platform();
        osSpecifics = require(platform + "Specifics");
    }
}

export = OsSpecifics;