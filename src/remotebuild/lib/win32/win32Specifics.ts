/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../../../typings/nconf.d.ts" />
/// <reference path="../../../typings/Q.d.ts" />
/// <reference path="../../../typings/tacoUtils.d.ts" />
/// <reference path="../../../typings/express.d.ts" />
/// <reference path="../../../typings/zip-stream.d.ts" />
"use strict";

import child_process = require ("child_process");
import express = require ("express");
import fs = require ("fs");
import nconf = require ("nconf");
import path = require ("path");
import Q = require ("q");

import HostSpecifics = require ("../hostSpecifics");
import RemoteBuildConf = require ("../remoteBuildConf");
import resources = require ("../../resources/resourceManager");
import utils = require ("taco-utils");

class Win32Specifics implements HostSpecifics.IHostSpecifics {
    public defaults(base: { [key: string]: any }): { [key: string]: any } {
        var win32defaults: { [key: string]: any } = {
            serverDir: path.join(utils.UtilHelper.tacoHome, "remote-builds"),
            writePidToFile: false,
            lang: "en", // TODO (Devdiv: 1160573), determine appropriate language on windows
            suppressSetupMessage: false,
        };
        Object.keys(win32defaults).forEach(function (key: string): void {
            if (!(key in base)) {
                base[key] = win32defaults[key];
            }
        });

        return base;
    }

    // Note: we acquire dependencies for deploying and debugging here rather than in taco-remote-lib because it may require user intervention, and taco-remote-lib may be acquired unattended in future.
    public initialize(conf: RemoteBuildConf): Q.Promise<any> {
        return Q({});
    }

    public printUsage(language: string): void {
        console.info(resources.getStringForLanguage(language, "usageInformation"));
    }

    public resetServerCert(conf: RemoteBuildConf): Q.Promise<any> {
        return Q.reject(new Error("Not Implemented"));
    }

    public generateClientCert(conf: RemoteBuildConf): Q.Promise<number> {
        return Q.reject<number>(new Error("Not Implemented"));
    }

    public initializeServerCerts(conf: RemoteBuildConf): Q.Promise<HostSpecifics.ICertStore> {
        return Q.reject<HostSpecifics.ICertStore>(new Error("Not Implemented"));
    }

    public getServerCerts(): Q.Promise<HostSpecifics.ICertStore> {
        return Q.reject<HostSpecifics.ICertStore>(new Error("Not Implemented"));
    }

    public removeAllCertsSync(conf: RemoteBuildConf): void {
        throw new Error("Not Implemented");
    }

    public downloadClientCerts(req: express.Request, res: express.Response): void {
        res.sendStatus(404);
    }

    public getHttpsAgent(conf: RemoteBuildConf): Q.Promise<NodeJSHttp.Agent> {
        throw new Error("Not Implemented");
    }
}

var win32Specifics: HostSpecifics.IHostSpecifics = new Win32Specifics();
export = win32Specifics;
