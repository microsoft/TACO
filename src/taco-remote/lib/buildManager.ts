/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/express.d.ts" />
/// <reference path="../../typings/expressExtensions.d.ts" />
/// <reference path="../../typings/fstream.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/tacoRemote.d.ts" />
/// <reference path="../../typings/tacoRemoteLib.d.ts" />
/// <reference path="../../typings/tacoUtils.d.ts" />
/// <reference path="../../typings/tar.d.ts" />
/// <reference path="./requestRedirector.ts" />
"use strict";

import child_process = require ("child_process");
import express = require ("express");
import fs = require ("fs");
import path = require ("path");
import Q = require ("q");
import tar = require ("tar");
import zlib = require ("zlib");

import BuildRetention = require ("./buildRetention");
import resources = require ("../resources/resourceManager");
import TacoRemoteConfig = require ("./tacoRemoteConfig");
import utils = require ("taco-utils");

import BuildInfo = utils.BuildInfo;
import Logger = utils.Logger;

interface IBuildMetrics {
    submitted: number;
    accepted: number;
    rejected: number;
    failed: number;
    succeeded: number;
    downloaded: number;
};

class BuildManager {
    private baseBuildDir: string;
    private maxBuildsInQueue: number;
    private nextBuildNumber: number;
    private deleteBuildsOnShutdown: boolean;
    private builds: { [idx: string]: BuildInfo };
    private currentBuild: BuildInfo;
    private queuedBuilds: BuildInfo[];
    private buildMetrics: IBuildMetrics;
    private requestRedirector: TacoRemoteLib.IRequestRedirector;
    private serverConf: TacoRemoteConfig;
    private buildRetention: BuildRetention;
    private telemetry: utils.TelemetryGenerator;

    constructor(conf: TacoRemoteConfig) {
        this.serverConf = conf;
        this.baseBuildDir = path.resolve(process.cwd(), conf.serverDir, "taco-remote", "builds");
        utils.UtilHelper.createDirectoryIfNecessary(this.baseBuildDir);
        this.maxBuildsInQueue = conf.maxBuildsInQueue;
        this.deleteBuildsOnShutdown = conf.deleteBuildsOnShutdown;
        var allowsEmulate: boolean = conf.allowsEmulate;

        try {
            this.requestRedirector = require(conf.get("redirector"));
        } catch (e) {
            this.requestRedirector = require("./requestRedirector");
        }

        this.buildRetention = new BuildRetention(this.baseBuildDir, conf);
        // For now, using process startup pid as the initial build number is good enough to avoid collisions with prior server runs against 
        // the same base build dir, especially when build cleanup is used.
        this.nextBuildNumber = process.pid;
        this.builds = {};
        this.buildMetrics = {
            submitted: 0,
            accepted: 0,
            rejected: 0,
            failed: 0,
            succeeded: 0,
            downloaded: 0
        };
        this.currentBuild = null;
        this.queuedBuilds = [];
    }

    public shutdown(): void {
        if (this.deleteBuildsOnShutdown) {
            this.buildRetention.deleteAllSync(this.builds);
        }
    }

    public submitNewBuild(req: express.Request): Q.Promise<BuildInfo> {
        Logger.log(resources.getString("NewBuildSubmitted"));
        Logger.log(req.url);
        Logger.log(JSON.stringify(req.headers));

        this.buildMetrics.submitted++;

        if (this.queuedBuilds.length === this.maxBuildsInQueue) {
            var message: string = resources.getString("BuildQueueFull", this.maxBuildsInQueue);
            var error: any = new Error(message);
            error.code = 503;
            throw error;
        }

        // For now these are part of the request query (after the ?) but might look to make these part of the path, or headers, as most are not really optional parameters
        var buildCommand: string = req.query.command || "build";
        var configuration: string = req.query.cfg || "release";
        var options: string = req.query.options || "";
        var buildNumber: number = req.query.buildNumber || null;
        var buildPlatform: string = req.query.platform || "ios";
        var logLevel: string = req.query.logLevel || null;

        var self: BuildManager = this;
        return this.requestRedirector.getPackageToServeRequest(req).then(function (pkg: TacoRemoteLib.IRemoteLib): Q.Promise<BuildInfo> {
            pkg.init(self.serverConf);
            var errors: string[] = [];
            if (!pkg.validateBuildRequest(req, errors)) {
                self.buildMetrics.rejected++;
                return Q.reject<BuildInfo>(errors);
            }

            self.buildMetrics.accepted++;

            if (!buildNumber) {
                buildNumber = ++self.nextBuildNumber;
            }

            var buildDir: string = path.join(self.baseBuildDir, "" + buildNumber);
            if (!fs.existsSync(buildDir)) {
                fs.mkdirSync(buildDir);
            }

            Logger.log(resources.getString("BuildManagerDirInit", buildDir));

            // Pass the build query to the buildInfo, for package-specific config options
            var params: any = req.query;
            params.status = BuildInfo.UPLOADING;
            params.buildCommand = buildCommand;
            params.buildPlatform = buildPlatform;
            params.configuration = configuration;
            params.buildLang = req.headers["accept-language"];
            params.buildDir = buildDir;
            params.buildNumber = buildNumber;
            params.options = options;
            params.logLevel = logLevel;

            // Save the Cordova version that was used for the previous build, if any
            if (self.builds[buildNumber] && self.builds[buildNumber].hasOwnProperty("vcordova")) {
                params["previousvcordova"] = self.builds[buildNumber]["vcordova"];
            }

            var buildInfo: BuildInfo = new BuildInfo(params);

            // Associate the buildInfo object with the package used to service it, but without changing the JSON representation;
            Object.defineProperty(buildInfo, "pkg", { enumerable: false, writable: true, configurable: true });
            buildInfo["pkg"] = pkg;

            self.builds[buildNumber] = buildInfo;

            var deferred: Q.Deferred<BuildInfo> = Q.defer<BuildInfo>();
            self.saveUploadedTgzFile(buildInfo, req, function (err: any, result: any): void {
                if (err) {
                    deferred.reject(err);
                } else {
                    deferred.resolve(buildInfo);
                    self.beginBuild(req, buildInfo);
                }
            });
            return deferred.promise;
        });
    }

    public getBuildInfo(id: number): BuildInfo {
        return this.builds[id] || null;
    }

    public downloadBuildLog(id: number, offset: number, res: express.Response): void {
        var buildInfo: BuildInfo = this.builds[id];
        if (!buildInfo) {
            res.end();
            return;
        }

        var buildLog: string = path.join(buildInfo.buildDir, "build.log");
        if (!fs.existsSync(buildLog)) {
            res.end();
            return;
        }

        var logStream: fs.ReadStream = fs.createReadStream(buildLog, { start: offset });
        logStream.on("error", function (err: any): void {
            Logger.log(resources.getString("LogFileReadError"));
            Logger.log(err);
        });
        logStream.pipe(res);
    }

    public getAllBuildInfo(): TacoRemote.IServerInfo {
        return {
            metrics: this.buildMetrics,
            queued: this.queuedBuilds.length,
            currentBuild: this.currentBuild,
            queuedBuilds: this.queuedBuilds,
            allBuilds: this.builds
        };
    }

    // Downloads the requested build.
    public downloadBuild(buildInfo: BuildInfo, req: express.Request, res: express.Response): void {
        var self: BuildManager = this;
        if (!buildInfo["pkg"]) {
            res.status(404).send(resources.getStringForLanguage(req, "MalformedBuildInfo"));
            return;
        }

        buildInfo["pkg"].downloadBuild(buildInfo, req, res, function (err: any): void {
            if (!err) {
                self.buildMetrics.downloaded++;
                buildInfo.updateStatus(BuildInfo.DOWNLOADED);
            }
        });
    }

    public getBaseBuildDir(): string {
        return this.baseBuildDir;
    }

    public emulateBuild(buildInfo: BuildInfo, req: express.Request, res: express.Response): void {
        if (!utils.ArgsHelper.argToBool(this.serverConf.allowsEmulate)) {
            res.status(403).send(resources.getStringForLanguage(req, "EmulateDisabled"));
            return;
        }

        if (!buildInfo["pkg"]) {
            res.status(404).send(resources.getStringForLanguage(req, "MalformedBuildInfo"));
            return;
        }

        buildInfo["pkg"].emulateBuild(buildInfo, req, res);
    }

    public deployBuild(buildInfo: BuildInfo, req: express.Request, res: express.Response): void {
        if (!buildInfo["pkg"]) {
            res.status(404).send(resources.getStringForLanguage(req, "MalformedBuildInfo"));
            return;
        }

        buildInfo["pkg"].deployBuild(buildInfo, req, res);
    }

    public runBuild(buildInfo: BuildInfo, req: express.Request, res: express.Response): void {
        if (!buildInfo["pkg"]) {
            res.status(404).send(resources.getStringForLanguage(req, "MalformedBuildInfo"));
            return;
        }

        buildInfo["pkg"].runBuild(buildInfo, req, res);
    }

    public debugBuild(buildInfo: BuildInfo, req: express.Request, res: express.Response): void {
        if (!buildInfo["pkg"]) {
            res.status(404).send(resources.getStringForLanguage(req, "MalformedBuildInfo"));
            return;
        }

        buildInfo["pkg"].debugBuild(buildInfo, req, res);
    }

    private saveUploadedTgzFile(buildInfo: BuildInfo, req: express.Request, callback: Function): void {
        var self: BuildManager = this;
        Logger.log(resources.getString("UploadSaving", buildInfo.buildDir));
        buildInfo.tgzFilePath = path.join(buildInfo.buildDir, "upload_" + buildInfo.buildNumber + ".tgz");
        var tgzFile: fs.WriteStream = fs.createWriteStream(buildInfo.tgzFilePath);
        req.pipe(tgzFile);
        tgzFile.on("finish", function (): void {
            buildInfo.updateStatus(BuildInfo.UPLOADED);
            Logger.log(resources.getString("UploadSavedSuccessfully", buildInfo.tgzFilePath));
            callback(null, buildInfo);
        });
        tgzFile.on("error", function (err: Error): void {
            buildInfo.updateStatus(BuildInfo.ERROR, "ErrorSavingTgz", tgzFile, err.message);
            Logger.logError(resources.getString("ErrorSavingTgz", tgzFile, err));
            self.buildMetrics.failed++;
            callback(err, buildInfo);
        });
    }

    private beginBuild(req: express.Request, buildInfo: BuildInfo): void {
        var self: BuildManager = this;
        var extractToDir: string = path.join(buildInfo.buildDir, "cordovaApp");
        var extractToRemoteDir = path.join(extractToDir, "remote");
        buildInfo.buildSuccessful = false;
        buildInfo.appDir = extractToDir;
        try {
            if (!fs.existsSync(extractToDir)) {
                fs.mkdirSync(extractToDir);
            }
        } catch (e) {
            buildInfo.updateStatus(BuildInfo.ERROR, resources.getStringForLanguage(req, "FailedCreateDirectory", extractToDir, e.message));
            Logger.logError(resources.getString("FailedCreateDirectory", extractToDir, e.message));
            self.buildMetrics.failed++;
            return;
        }

        if (!fs.existsSync(buildInfo.tgzFilePath)) {
            buildInfo.updateStatus(BuildInfo.ERROR, resources.getStringForLanguage(req, "NoTgzFound", buildInfo.tgzFilePath));
            Logger.logError(resources.getString("NoTgzFound", buildInfo.tgzFilePath));
            self.buildMetrics.failed++;
            return;
        }

        var onError: (err: Error) => void = function (err: Error): void {
            buildInfo.updateStatus(BuildInfo.ERROR, resources.getStringForLanguage(req, "TgzExtractError", buildInfo.tgzFilePath, err.message));
            Logger.log(resources.getString("TgzExtractError", buildInfo.tgzFilePath, err.message));
            self.buildMetrics.failed++;
        };

        // A tar file created on windows has no notion of 'rwx' attributes on a directory, so directories are not executable when 
        // extracting to unix, causing the extract to fail because the directory cannot be navigated. 
        // Also, the tar module does not handle an 'error' event from it's underlying stream, so we have no way of catching errors like an unwritable
        // directory in the tar gracefully- they cause an uncaughtException and server shutdown. For safety sake we force 'rwx' for all on everything.
        var tarFilter: (who: Fstream.Writer) => boolean = function (who: Fstream.Writer): boolean {
            who.props.mode = 511; // "chmod 777"

            // Do not include the /plugins folder
            var localPath: string = path.relative(extractToDir, who.props.path);
            return !(localPath.split(path.sep)[0] === "plugins");
        };

        var pluginsOnlyFilter: (who: Fstream.Writer) => boolean = function (who: Fstream.Writer): boolean {
            who.props.mode = 511; // "chmod 0777"

            // Here we want to exclusively extract the contents of the /plugins folder, and we will put it in a separate location
            // Later in taco-remote-lib we will manually merge the plugins into the project to ensure they are added correctly.
            var localPath: string = path.relative(extractToRemoteDir, who.props.path);
            return !who.props.depth || (who.props.depth === 0 && who.props.Directory) || localPath.split(path.sep)[0] === "plugins";
        };

        var extractDeferred: Q.Deferred<any> = Q.defer();
        var extractPluginDeferred: Q.Deferred<any> = Q.defer();
        // strip: 1 means take the top level directory name off when extracting (we want buildInfo.appDir to be the top level dir.)
        // TODO: Remove the casting once we've get some complete/up-to-date .d.ts files. See https://github.com/Microsoft/TACO/issues/18
        var tarExtractor: tar.ExtractStream = tar.Extract(<tar.ExtractOptions> { path: extractToDir, strip: 1, filter: tarFilter });
        tarExtractor.on("end", function (): void {
            self.removeDeletedFiles(buildInfo);
            extractDeferred.resolve({});
        });
        // TODO: Remove the casting once we've get some complete/up-to-date .d.ts files. See https://github.com/Microsoft/TACO/issues/18
        var pluginExtractor: tar.ExtractStream = tar.Extract(<tar.ExtractOptions> { path: extractToRemoteDir, strip: 1, filter: pluginsOnlyFilter });
        pluginExtractor.on("end", function (): void {
            extractPluginDeferred.resolve({});
        });

        var unzip: zlib.Gunzip  = zlib.createGunzip();
        var tgzStream: fs.ReadStream = fs.createReadStream(buildInfo.tgzFilePath);
        tarExtractor.on("error", onError);
        pluginExtractor.on("error", onError);
        unzip.on("error", onError);
        tgzStream.on("error", onError);
        tgzStream.pipe(unzip);
        unzip.pipe(tarExtractor).on("error", onError);
        unzip.pipe(pluginExtractor).on("error", onError);

        Q.all([extractDeferred.promise, extractPluginDeferred.promise]).then(function (): void {
            buildInfo.updateStatus(BuildInfo.EXTRACTED);
            Logger.log(resources.getString("UploadExtractedSuccessfully", extractToDir));
            self.build(buildInfo);
        });
    }

    private removeDeletedFiles(buildInfo: BuildInfo): void {
        var changeListFile: string = path.join(buildInfo.appDir, "changeList.json");
        if (fs.existsSync(changeListFile)) {
            buildInfo.changeList = JSON.parse(fs.readFileSync(changeListFile, { encoding: "utf-8" }));
            if (buildInfo.changeList) {
                buildInfo.changeList.deletedFiles = buildInfo.changeList.deletedFiles.map(function (deletedFile: string): string {
                    // Convert all \ and / characters in the path string into platform-appropriate path separators
                    return deletedFile.replace(/[\\\/]/g, path.sep);
                });
                buildInfo.changeList.deletedFiles.forEach(function (deletedFile: string): void {
                    if (deletedFile.split(path.sep)[0] !== "plugins") {
                        // Don't remove files within the plugins folder; they should be cordova plugin remove'd later on
                        var fileToDelete: string = path.resolve(buildInfo.appDir, deletedFile);
                        if (fileToDelete.indexOf(buildInfo.appDir) !== 0) {
                            // Escaping the project folder; don't let that happen.
                            Logger.logWarning(resources.getString("AttemptedDeleteFileOutsideProject", fileToDelete));
                            return;
                        }

                        if (fs.existsSync(fileToDelete)) {
                            fs.unlinkSync(fileToDelete);
                        }
                    }
                });
            }
        }
    }

    // build may change the current working directory to the app dir. To build multiple builds in parallel we will
    // need to fork out child processes. For now, limiting to one build at a time, and queuing up new builds that come in while a current build is in progress.
    private build(buildInfo: BuildInfo): void {
        var self: BuildManager = this;
        if (self.currentBuild) {
            Logger.log(resources.getString("NewBuildQueued", buildInfo.buildNumber));
            self.queuedBuilds.push(buildInfo);
            return;
        } else {
            Logger.log(resources.getString("NewBuildStarted", buildInfo.buildNumber));
            self.currentBuild = buildInfo;
        }

        // Good point to purge old builds
        this.buildRetention.purge(self.builds);

        if (!fs.existsSync(buildInfo.appDir)) {
            Logger.log(resources.getString("BuildDirectoryNotFound", buildInfo.buildDir));
            buildInfo.updateStatus(BuildInfo.ERROR, "BuildDirectoryNotFound", buildInfo.buildDir);
            self.buildMetrics.failed++;
            self.dequeueNextBuild();
            return;
        }

        if (!buildInfo["pkg"]) {
            buildInfo.updateStatus(BuildInfo.ERROR, "MalformedBuildInfo");
            self.dequeueNextBuild();
        } else {
            buildInfo["pkg"].build(buildInfo, function (resultBuildInfo: BuildInfo): void {
                buildInfo.updateStatus(resultBuildInfo.status, resultBuildInfo.messageId, resultBuildInfo.messageArgs);
                if (buildInfo.status === BuildInfo.COMPLETE) {
                    self.buildMetrics.succeeded++;
                    buildInfo.buildSuccessful = true;
                } else if (buildInfo.status === BuildInfo.INVALID) {
                    self.buildMetrics.rejected++;
                } else {
                    self.buildMetrics.failed++;
                }
                
                utils.TelemetryHelper.generate("build",
                    (telemetry: utils.TelemetryGenerator) => {
                        telemetry
                            .add("cordovaVersion", buildInfo["vcordova"], false)
                            .add("locale", buildInfo.buildLang, false)
                            .add("zippedFileSize", fs.statSync(buildInfo.tgzFilePath)["size"], false)
                            .add("queueSize", self.queuedBuilds.length, false)
                            .add("isDeviceBuild", self.currentBuild.options.indexOf("--device") !== -1, false)
                            .add("wasBuildSuccessful", buildInfo.status === BuildInfo.COMPLETE, false);
                    });

                self.dequeueNextBuild();
            });
        }
    }

    private dequeueNextBuild(): void {
        Logger.log(resources.getString("BuildMovingOn"));
        this.currentBuild = null;
        var nextBuild: BuildInfo = this.queuedBuilds.shift();
        if (nextBuild) {
            this.build(nextBuild);
        }
    }
}

export = BuildManager;
