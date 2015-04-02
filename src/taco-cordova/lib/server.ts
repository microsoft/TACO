/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/Q.d.ts" />
/// <reference path="../../typings/nconf.d.ts" />
/// <reference path="../../typings/taco-utils.d.ts" />
/// <reference path="../../typings/express.d.ts" />
/// <reference path="../../typings/express-extensions.d.ts" />
/// <reference path="../../typings/taco-remote-lib.d.ts" />
/// <reference path="../../typings/taco-remote.d.ts" />
/// <reference path="../../typings/serve-index.d.ts" />
"use strict";

import express = require ("express");
import fs = require ("fs");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import serveIndex = require ("serve-index");

import buildManager = require ("./build-manager");
import HostSpecifics = require ("./host-specifics");
import selftest = require ("./selftest");
import TacoCordovaConf = require ("./taco-cordova-conf");
import utils = require ("taco-utils");
import util = require ("util");

import resources = utils.ResourcesManager;

module ServerModule {
    export function create(conf: TacoRemote.IDict, modPath: string, serverCapabilities: TacoRemote.IServerCapabilities): Q.Promise<TacoRemote.IServerModule> {
        resources.init(conf.get("lang"), path.join(__dirname, "..", "resources"));
        return HostSpecifics.hostSpecifics.initialize(conf).then(function (): TacoRemote.IServerModule {
            return new Server(new TacoCordovaConf(conf), modPath);
        });
    }

    export function test(conf: TacoRemote.IDict, modPath: string, serverTestCapabilities: TacoRemote.IServerTestCapabilities): Q.Promise<any> {
        var host = util.format("http%s://%s:%d", utils.UtilHelper.argToBool(conf.get("secure")) ? "s" : "", conf.get("hostname") || os.hostname, conf.get("port"));
        var downloadDir = path.join(conf.get("serverDir"), "selftest", "taco-cordova");
        utils.UtilHelper.createDirectoryIfNecessary(downloadDir);
        return selftest.test(host, modPath, downloadDir, /* deviceBuild */ false, serverTestCapabilities.agent).then(function (): Q.Promise<any> {
            return selftest.test(host, modPath, downloadDir, /* deviceBuild */ true, serverTestCapabilities.agent);
        });
    }
}

export = ServerModule;

class Server implements TacoRemote.IServerModule {
    private serverConf: TacoCordovaConf;
    private modPath: string;

    constructor(conf: TacoCordovaConf, modPath: string) {
        this.serverConf = conf;
        this.modPath = modPath;

        // Initialize the build manager (after our app settings are all setup)
        buildManager.init(conf);
    }

    public getRouter(): express.Router {
        var router = express.Router();
        router.post("/build/tasks", this.submitNewBuild.bind(this));
        router.get("/build/tasks/:id", this.getBuildStatus);
        router.get("/build/tasks/:id/log", this.getBuildLog);
        router.get("/build/tasks", this.getAllBuildStatus);
        router.get("/build/:id", this.getBuildStatus);
        router.get("/build/:id/download", this.checkBuildThenAction(buildManager.downloadBuild));

        router.get("/build/:id/emulate", this.checkBuildThenAction(buildManager.emulateBuild));
        router.get("/build/:id/deploy", this.checkBuildThenAction(buildManager.deployBuild));
        router.get("/build/:id/run", this.checkBuildThenAction(buildManager.runBuild));
        router.get("/build/:id/debug", this.checkBuildThenAction(buildManager.debugBuild));

        router.use("/files", serveIndex(buildManager.getBaseBuildDir()));
        router.use("/files", express.static(buildManager.getBaseBuildDir()));

        return router;
    }

    public shutdown(): void {
        buildManager.shutdown();
    }

    // Submits a new build task
    private submitNewBuild(req: express.Request, res: express.Response): void {
        var port = this.serverConf.port;
        var modPath = this.modPath;
        Q.nfcall(buildManager.submitNewBuild, req).then(function (buildInfo: utils.BuildInfo): void {
            var contentLocation = util.format("%s://%s:%d/%s/build/tasks/%d", req.protocol, req.host, port, modPath, buildInfo.buildNumber);
            res.set({
                "Content-Type": "application/json",
                "Content-Location": contentLocation
            });
            res.status(202).json(buildInfo.localize(req, resources));
        }, function (err: any): void {
            res.set({ "Content-Type": "application/json" });
            res.status(err.code || 400).send({ status: resources.getStringForLanguage(req, "InvalidBuildRequest"), errors: err });
        }).done();
    }

    // Queries on the status of a build task, used by a client to poll
    private getBuildStatus(req: express.Request, res: express.Response): void {
        var buildInfo = buildManager.getBuildInfo(req.params.id);
        if (buildInfo) {
            buildInfo.localize(req, resources);
            if (!buildInfo.message) {
                // We can't localize this in this package, we need to get whichever package serviced the request to localize the request
                buildInfo.localize(req, (<TacoRemoteLib.IRemoteLib>buildInfo["pkg"]).locResources);
            }

            res.status(200).json(buildInfo);
        } else {
            res.status(404).send(resources.getStringForLanguage(req, "BuildNotFound", req.params.id));
        }
    }

    // Retrieves log file for a build task, can be used by a client when build failed
    private getBuildLog(req: express.Request, res: express.Response): void {
        var buildInfo = buildManager.getBuildInfo(req.params.id);
        if (buildInfo) {
            res.set("Content-Type", "text/plain");
            buildManager.downloadBuildLog(req.params.id, req.query.offset | 0, res);
        } else {
            res.status(404).send(resources.getStringForLanguage(req, "BuildNotFound", req.params.id));
        }
    }

    // Queries on the status of all build tasks
    private getAllBuildStatus(req: express.Request, res: express.Response): void {
        var allBuildInfo = buildManager.getAllBuildInfo();
        res.json(200, allBuildInfo);
    }

    private checkBuildThenAction(func: (buildInfo: utils.BuildInfo, req: express.Request, res: express.Response) => void): (req: express.Request, res: express.Response) => void {
        return function (req: express.Request, res: express.Response): void {
            var buildInfo = buildManager.getBuildInfo(req.params.id);
            if (!buildInfo) {
                res.status(404).send(resources.getStringForLanguage(req, "BuildNotFound", req.params.id));
                return;
            }

            if (!buildInfo.buildSuccessful) {
                res.status(404).send(resources.getStringForLanguage(req, "BuildNotCompleted", buildInfo.status));
                return;
            }

            func.bind(buildManager)(buildInfo, req, res);
        };
    }
}
