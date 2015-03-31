/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */
/// <reference path="../../../typings/nconf.d.ts" />
/// <reference path="../../../typings/Q.d.ts" />
/// <reference path="../../../typings/taco-utils.d.ts" />
/// <reference path="../../../typings/express.d.ts" />
/// <reference path="../../../typings/zip-stream.d.ts" />
"use strict";

import child_process = require ("child_process");
import express = require ("express");
import fs = require ("fs");
import nconf = require ("nconf");
import path = require ("path");
import Q = require ("q");

import HostSpecifics = require ("../host-specifics");
import utils = require ("taco-utils");

var resources = utils.ResourcesManager;

class Win32Specifics implements HostSpecifics.IHostSpecifics {
    public defaults(base: { [key: string]: any }): { [key: string]: any } {
        var win32defaults: { [key: string]: any } = {
            serverDir: path.join(utils.UtilHelper.tacoHome, "remote-builds"),
            writePidToFile: false,
            lang: "en", // TODO: determine appropriate language on windows
            suppressVisualStudioMessage: false,
        };
        Object.keys(win32defaults).forEach(function (key: string): void {
            if (!(key in base)) {
                base[key] = win32defaults[key];
            }
        });

        return base;
    }

    // Note: we acquire dependencies for deploying and debugging here rather than in taco-remote-lib because it may require user intervention, and taco-remote-lib may be acquired unattended in future.
    public initialize(conf: HostSpecifics.IConf): Q.Promise<any> {
        return Q({});
    }

    public printUsage(language: string): void {
        console.info(resources.getStringForLanguage(language, "UsageInformation"));
    }

    public resetServerCert(conf: HostSpecifics.IConf): Q.Promise<any> {
        return Q.reject(new Error("Not Implemented"));
    }

    public generateClientCert(conf: HostSpecifics.IConf): Q.Promise<number> {
        return Q.reject<number>(new Error("Not Implemented"));
    }

    public initializeServerCerts(conf: HostSpecifics.IConf): Q.Promise<HostSpecifics.ICertStore> {
        return Q.reject<HostSpecifics.ICertStore>(new Error("Not Implemented"));
    }

    public getServerCerts(): Q.Promise<HostSpecifics.ICertStore> {
        return Q.reject<HostSpecifics.ICertStore>(new Error("Not Implemented"));
    }

    public removeAllCertsSync(conf: HostSpecifics.IConf): void {
        throw new Error("Not Implemented");
    }

    public downloadClientCerts(req: express.Request, res: express.Response): void {
        res.sendStatus(404);
    }
}

var darwinSpecifics: HostSpecifics.IHostSpecifics = new Win32Specifics();
export = darwinSpecifics;