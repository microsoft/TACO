/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/Q.d.ts" />
/// <reference path="../../typings/tacoUtils.d.ts" />
/// <reference path="../../typings/express.d.ts" />
/// <reference path="../../typings/expressExtensions.d.ts" />
/// <reference path="../../typings/tacoRemoteLib.d.ts" />
/// <reference path="../../typings/remotebuild.d.ts" />
/// <reference path="../../typings/serve-index.d.ts" />
"use strict";

import express = require ("express");
import fs = require ("fs");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import serveIndex = require ("serve-index");
import util = require ("util");

import BuildManager = require ("./buildManager");
import Help = require ("./help");
import HostSpecifics = require ("./hostSpecifics");
import selftest = require ("./selftest");
import TacoRemoteConfig = require ("./tacoRemoteConfig");

import utils = require ("taco-utils");

import Logger = utils.Logger;

class ServerModuleFactory implements RemoteBuild.IServerModuleFactory {
    public create(conf: RemoteBuild.IRemoteBuildConfiguration, modConfig: RemoteBuild.IServerModuleConfiguration, serverCapabilities: RemoteBuild.IServerCapabilities): Q.Promise<RemoteBuild.IServerModule> {
        var tacoRemoteConf = new TacoRemoteConfig(conf, modConfig);
        return HostSpecifics.hostSpecifics.initialize(tacoRemoteConf).then(function (): RemoteBuild.IServerModule {
            return new Server(tacoRemoteConf, modConfig.mountPath);
        });
    }

    public test(conf: RemoteBuild.IRemoteBuildConfiguration, modConfig: RemoteBuild.IServerModuleConfiguration, serverTestCapabilities: RemoteBuild.IServerTestCapabilities, cliArguments: string[]): Q.Promise<any> {
        var host = util.format("http%s://%s:%d", utils.ArgsHelper.argToBool(conf.secure) ? "s" : "", conf.hostname || os.hostname, conf.port);
        var downloadDir = path.join(conf.serverDir, "selftest", "taco-remote");
        utils.UtilHelper.createDirectoryIfNecessary(downloadDir);
        return selftest.test(host, modConfig.mountPath, downloadDir, cliArguments.indexOf("--device") !== -1, serverTestCapabilities.agent);
    }

    public printHelp(conf: RemoteBuild.IRemoteBuildConfiguration, modConfig: RemoteBuild.IServerModuleConfiguration): void {
        var tacoRemoteConf = new TacoRemoteConfig(conf, modConfig);
        var resources = new utils.ResourceManager(path.join(__dirname, "..", "resources"), conf.lang);
        var help: Help = new Help();
        help.run({ options: {}, original: ["taco-remote"], remain: ["taco-remote"] }).done();
    }

    public getConfig(conf: RemoteBuild.IRemoteBuildConfiguration, modConfig: RemoteBuild.IServerModuleConfiguration): RemoteBuild.IServerModuleConfiguration {
        var tacoRemoteConf = new TacoRemoteConfig(conf, modConfig);
        return tacoRemoteConf.serialize();
    }
}

var serverModuleFactory = new ServerModuleFactory();
export = serverModuleFactory;

class Server implements RemoteBuild.IServerModule {
    private serverConf: TacoRemoteConfig;
    private modPath: string;
    private buildManager: BuildManager;
    private resources: utils.ResourceManager;

    constructor(conf: TacoRemoteConfig, modPath: string) {
        this.serverConf = conf;
        this.modPath = modPath;

        // Initialize the build manager (after our app settings are all setup)
        this.buildManager = new BuildManager(conf);
        this.resources = new utils.ResourceManager(path.join(__dirname, "..", "resources"), conf.lang);
    }

    public getRouter(): express.Router {
        var router = express.Router();
        router.post("/build/tasks", this.submitNewBuild.bind(this));
        router.get("/build/tasks/:id", this.getBuildStatus.bind(this));
        router.get("/build/tasks/:id/log", this.getBuildLog.bind(this));
        router.get("/build/tasks", this.getAllBuildStatus.bind(this));
        router.get("/build/:id", this.getBuildStatus.bind(this));
        router.get("/build/:id/download", this.checkBuildThenAction(this.buildManager.downloadBuild));

        router.get("/build/:id/emulate", this.checkBuildThenAction(this.buildManager.emulateBuild));
        router.get("/build/:id/deploy", this.checkBuildThenAction(this.buildManager.deployBuild));
        router.get("/build/:id/run", this.checkBuildThenAction(this.buildManager.runBuild));
        router.get("/build/:id/debug", this.checkBuildThenAction(this.buildManager.debugBuild));

        router.use("/files", serveIndex(this.buildManager.getBaseBuildDir()));
        router.use("/files", express.static(this.buildManager.getBaseBuildDir()));

        return router;
    }

    public shutdown(): void {
        this.buildManager.shutdown();
    }

    // Submits a new build task
    private submitNewBuild(req: express.Request, res: express.Response): void {
        var port = this.serverConf.port;
        var modPath = this.modPath;
        var self = this;
        this.buildManager.submitNewBuild(req).then(function (buildInfo: utils.BuildInfo): void {
            var contentLocation = util.format("%s://%s:%d/%s/build/tasks/%d", req.protocol, req.hostname, port, modPath, buildInfo.buildNumber);
            res.set({
                "Content-Type": "application/json",
                "Content-Location": contentLocation
            });
            res.status(202).json(buildInfo.localize(req, self.resources));
        }, function (err: any): void {
                if (err.code) {
                    res.status(err.code).send(err.toString());
                } else {
                    res.set({ "Content-Type": "application/json" });
                    res.status(400).send({ status: self.resources.getStringForLanguage(req, "InvalidBuildRequest"), errors: err.toString() });
                }
            }).done();
    }

    // Queries on the status of a build task, used by a client to poll
    private getBuildStatus(req: express.Request, res: express.Response): void {
        var buildInfo = this.buildManager.getBuildInfo(req.params.id);
        if (buildInfo) {
            buildInfo.localize(req, this.resources);
            if (!buildInfo.message) {
                // We can't localize this in this package, we need to get whichever package serviced the request to localize the request
                buildInfo.localize(req, (<TacoRemoteLib.IRemoteLib>buildInfo["pkg"]).locResources);
            }

            res.status(200).json(buildInfo);
        } else {
            res.status(404).send(this.resources.getStringForLanguage(req, "BuildNotFound", req.params.id));
        }
    }

    // Retrieves log file for a build task, can be used by a client when build failed
    private getBuildLog(req: express.Request, res: express.Response): void {
        var buildInfo = this.buildManager.getBuildInfo(req.params.id);
        if (buildInfo) {
            res.set("Content-Type", "text/plain");
            this.buildManager.downloadBuildLog(req.params.id, req.query.offset | 0, res);
        } else {
            res.status(404).send(this.resources.getStringForLanguage(req, "BuildNotFound", req.params.id));
        }
    }

    // Queries on the status of all build tasks
    private getAllBuildStatus(req: express.Request, res: express.Response): void {
        var allBuildInfo = this.buildManager.getAllBuildInfo();
        res.status(200).json(allBuildInfo);
    }

    private checkBuildThenAction(func: (buildInfo: utils.BuildInfo, req: express.Request, res: express.Response) => void): (req: express.Request, res: express.Response) => void {
        var self = this;
        return function (req: express.Request, res: express.Response): void {
            var buildInfo = self.buildManager.getBuildInfo(req.params.id);
            if (!buildInfo) {
                res.status(404).send(self.resources.getStringForLanguage(req, "BuildNotFound", req.params.id));
                return;
            }

            if (!buildInfo.buildSuccessful) {
                res.status(404).send(self.resources.getStringForLanguage(req, "BuildNotCompleted", buildInfo.status));
                return;
            }

            func.call(self.buildManager, buildInfo, req, res);
        };
    }
}
