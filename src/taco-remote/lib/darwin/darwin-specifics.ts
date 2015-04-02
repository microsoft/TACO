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

import certs = require ("./darwin-certs");
import HostSpecifics = require ("../host-specifics");
import utils = require ("taco-utils");
import UtilHelper = utils.UtilHelper;

var resources = utils.ResourcesManager;

class DarwinSpecifics implements HostSpecifics.IHostSpecifics {
    public defaults(base: { [key: string]: any }): { [key: string]: any } {
        var osxdefaults: { [key: string]: any } = {
            serverDir: path.join(UtilHelper.tacoHome, "remote-builds"),
            nativeDebugProxyPort: 3001,
            webDebugProxyDevicePort: 9221,
            webDebugProxyRangeMin: 9222,
            webDebugProxyRangeMax: 9322,
            writePidToFile: false,
            lang: process.env.LANG && process.env.LANG.replace(/_.*/, "") || "en", // Convert "en_US.UTF8" to "en", similarly for other locales
            suppressVisualStudioMessage: false,
        };
        Object.keys(osxdefaults).forEach(function (key: string): void {
            if (!(key in base)) {
                base[key] = osxdefaults[key];
            }
        });

        return base;
    }

    // Note: we acquire dependencies for deploying and debugging here rather than in taco-remote-lib because it may require user intervention, and taco-remote-lib may be acquired unattended in future.
    public initialize(conf: HostSpecifics.IConf): Q.Promise<any> {
        if (process.getuid() === 0) {
            console.warn(resources.getStringForLanguage(conf.get("lang"), "RunningAsRootError"));
            process.exit(1);
        }

        // We don't get expansion of ~ or ~user by default
        // To support the simple case of "my home directory" I'm doing the replacement here
        // We only want to expand if the directory starts with ~/ not in cases such as /foo/~
        // Ideally we would also cope with the case of ~user/ but that is harder to find and probably less common
        var serverDir = conf.get("serverDir");
        conf.set("serverDir", serverDir.replace(/^~(?=\/|^)/, process.env.HOME));

        return Q({});
    }

    public printUsage(language: string): void {
        console.info(resources.getStringForLanguage(language, "UsageInformation"));
    }

    public resetServerCert(conf: HostSpecifics.IConf): Q.Promise<any> {
        return certs.resetServerCert(conf);
    }

    public generateClientCert(conf: HostSpecifics.IConf): Q.Promise<number> {
        return certs.generateClientCert(conf);
    }

    public initializeServerCerts(conf: HostSpecifics.IConf): Q.Promise<HostSpecifics.ICertStore> {
        return certs.initializeServerCerts(conf);
    }

    public getServerCerts(): Q.Promise<HostSpecifics.ICertStore> {
        return certs.getServerCerts();
    }

    public removeAllCertsSync(conf: HostSpecifics.IConf): void {
        certs.removeAllCertsSync(conf);
    }

    public downloadClientCerts(req: express.Request, res: express.Response): void {
        Q.fcall<string>(certs.downloadClientCerts, req.params.pin).then(function (pfxFile: string): void {
            res.sendFile(pfxFile);
        }).catch<void>(function (error: { code?: number; id: string}): void {
            if (error.code) {
                res.status(error.code).send(resources.getStringForLanguage(req, error.id));
            } else {
                res.status(404).send(error);
            }
        }).finally(function (): void { certs.invalidatePIN(req.params.pin); }).done();
    }
}

var darwinSpecifics: HostSpecifics.IHostSpecifics = new DarwinSpecifics();
export = darwinSpecifics;