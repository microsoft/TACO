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
    export interface ICertStore {
        newCerts: boolean;
        getKey: () => any;
        getCert: () => any;
        getCA: () => any;
    }

    export interface IOsSpecifics {
        defaults(base: any): any;
        initialize(): Q.Promise<any>;
        printUsage(language: string): void;

        resetServerCert(conf: Conf): Q.Promise<any>;
        generateClientCert(conf: Conf): Q.Promise<number>
        initializeServerCerts(conf: Conf): Q.Promise<ICertStore>;
        removeAllCertsSync(conf: Conf): void;
        downloadClientCerts(request: express.Request, response: express.Response): void;

        createBuildProcess(): child_process.ChildProcess;

        downloadBuild(buildInfo: bi.BuildInfo, request: express.Request, response: express.Response, callback: Function): void;

        emulateBuild(req: express.Request, res: express.Response): void;
        deployBuild(req: express.Request, res: express.Response): void;
        runBuild(req: express.Request, res: express.Response): void;
        debugBuild(req: express.Request, res: express.Response): void;
        getDebugPort(req: express.Request, res: express.Response): void;
    }

    export var osSpecifics: IOsSpecifics;
    var cachedSpecifics: IOsSpecifics;
    Object.defineProperty(OsSpecifics, 'osSpecifics', {
        get: function () {
            if (!cachedSpecifics) {
                var platform: string = os.platform();
                cachedSpecifics = require("./" + platform + "/" + platform + "Specifics");
            }
            return cachedSpecifics;
        }
    });
}

export = OsSpecifics;