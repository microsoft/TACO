/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../../typings/Q.d.ts" />
/// <reference path="../../../typings/tacoUtils.d.ts" />
/// <reference path="../../../typings/express.d.ts" />
/// <reference path="../../../typings/zip-stream.d.ts" />
"use strict";

import child_process = require ("child_process");
import express = require ("express");
import fs = require ("fs");
import https = require ("https");
import path = require ("path");
import Q = require ("q");

import certs = require ("./darwinCerts");
import HostSpecifics = require ("../hostSpecifics");
import RemoteBuildConf = require ("../remoteBuildConf");
import resources = require ("../../resources/resourceManager");
import utils = require ("taco-utils");

import UtilHelper = utils.UtilHelper;

class DarwinSpecifics implements HostSpecifics.IHostSpecifics {
    private static Config: RemoteBuildConf;
    public defaults(base: { [key: string]: any }): { [key: string]: any } {
        var osxdefaults: { [key: string]: any } = {
            serverDir: path.join(UtilHelper.tacoHome, "remote-builds"),
            writePidToFile: false,
            lang: process.env.LANG && process.env.LANG.replace(/_.*/, "") || "en", // Convert "en_US.UTF8" to "en", similarly for other locales
            suppressSetupMessage: false,
        };
        Object.keys(osxdefaults).forEach(function (key: string): void {
            if (!(key in base)) {
                base[key] = osxdefaults[key];
            }
        });

        return base;
    }

    // Note: we acquire dependencies for deploying and debugging here rather than in taco-remote-lib because it may require user intervention, and taco-remote-lib may be acquired unattended in future.
    public initialize(conf: RemoteBuildConf): Q.Promise<any> {
        DarwinSpecifics.Config = conf;
        if (process.getuid() === 0) {
            console.warn(resources.getString("RunningAsRootError"));
            process.exit(1);
        }

        return Q({});
    }

    public printUsage(language: string): void {
        console.info(resources.getStringForLanguage(language, "UsageInformation"));
    }

    public resetServerCert(conf: RemoteBuildConf): Q.Promise<any> {
        return certs.resetServerCert(conf);
    }

    public generateClientCert(conf: RemoteBuildConf): Q.Promise<number> {
        return certs.generateClientCert(conf);
    }

    public initializeServerCerts(conf: RemoteBuildConf): Q.Promise<HostSpecifics.ICertStore> {
        return certs.initializeServerCerts(conf);
    }

    public getServerCerts(): Q.Promise<HostSpecifics.ICertStore> {
        return certs.getServerCerts();
    }

    public removeAllCertsSync(conf: RemoteBuildConf): void {
        certs.removeAllCertsSync(conf);
    }

    public downloadClientCerts(req: express.Request, res: express.Response): void {
        Q.fcall<string>(certs.downloadClientCerts, DarwinSpecifics.Config, req.params.pin).then(function (pfxFile: string): void {
            res.sendFile(pfxFile);
        }).catch<void>(function (error: { code?: number; id: string}): void {
            if (error.code) {
                res.status(error.code).send(resources.getStringForLanguage(req, error.id));
            } else {
                res.status(404).send(error);
            }
        }).finally((): void => {
            certs.invalidatePIN(DarwinSpecifics.Config, req.params.pin);
        }).catch(function (err: Error): void {
            console.error(err);
        }).done();
    }

    public getHttpsAgent(conf: RemoteBuildConf): Q.Promise<NodeJSHttp.Agent> {
        if (conf.secure) {
            conf.set("suppressSetupMessage", true);
            return certs.generateClientCert(conf).then(function (pin: number): NodeJSHttp.Agent {
                var pfxPath = path.join(conf.serverDir, "certs", "client", pin.toString(), "client.pfx");
                var cert = fs.readFileSync(pfxPath);
                fs.unlinkSync(pfxPath);
                return new https.Agent({ strictSSL: true, pfx: cert });
            });
        } else {
            return Q.resolve<NodeJSHttp.Agent>(null);
        }
    }
}

var darwinSpecifics: HostSpecifics.IHostSpecifics = new DarwinSpecifics();
export = darwinSpecifics;
