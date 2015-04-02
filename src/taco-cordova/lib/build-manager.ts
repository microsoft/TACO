/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/taco-utils.d.ts" />
/// <reference path="../../typings/taco-remote-lib.d.ts" />
/// <reference path="../../typings/express.d.ts" />
/// <reference path="../../typings/express-extensions.d.ts" />
/// <reference path="../../typings/tar.d.ts" />
/// <reference path="./request-redirector.ts" />
"use strict";

import child_process = require ("child_process");
import express = require ("express");
import fs = require ("fs");
import path = require ("path");
import tar = require ("tar");
import zlib = require ("zlib");

import buildRetention = require ("./build-retention");
import HostSpecifics = require ("./host-specifics");
import TacoCordovaConf = require ("./taco-cordova-conf");
import utils = require ("taco-utils");

import resources = utils.ResourcesManager;

module BuildManager {
    var baseBuildDir: string,
        maxBuildsInQueue: number,
        nextBuildNumber: number,
        deleteBuildsOnShutdown: boolean,
        builds: { [idx: string]: utils.BuildInfo },
        currentBuild: utils.BuildInfo,
        queuedBuilds: utils.BuildInfo[],
        buildMetrics: {
            submitted: number;
            accepted: number;
            rejected: number;
            failed: number;
            succeeded: number;
            downloaded: number;
        },
        requestRedirector: TacoRemoteLib.IRequestRedirector,
        serverConf: TacoCordovaConf;

    export function init(conf: TacoCordovaConf): void {
        serverConf = conf;
        baseBuildDir = path.resolve(process.cwd(), conf.serverDir, "taco-cordova", "builds");
        utils.UtilHelper.createDirectoryIfNecessary(baseBuildDir);
        maxBuildsInQueue = conf.maxBuildsInQueue;
        deleteBuildsOnShutdown = conf.deleteBuildsOnShutdown;
        var allowsEmulate = conf.allowsEmulate;
        
        try {
            requestRedirector = require(conf.get("redirector"));
        } catch (e) {
            requestRedirector = require("./request-redirector");
        }

        buildRetention.init(baseBuildDir, conf);
        // For now, using process startup pid as the initial build number is good enough to avoid collisions with prior server runs against 
        // the same base build dir, especially when build cleanup is used.
        nextBuildNumber = process.pid;
        builds = {};
        buildMetrics = {
            submitted: 0,
            accepted: 0,
            rejected: 0,
            failed: 0,
            succeeded: 0,
            downloaded: 0
        };
        currentBuild = null;
        queuedBuilds = [];
        console.info(resources.getStringForLanguage(conf.lang, "BuildManagerInit"),
            baseBuildDir, maxBuildsInQueue, deleteBuildsOnShutdown, allowsEmulate, nextBuildNumber);
    }

    export function shutdown(): void {
        if (deleteBuildsOnShutdown) {
            buildRetention.deleteAllSync(builds);
        }
    }

    export function submitNewBuild(req: express.Request, callback: Function): void {
        console.info(resources.getStringForLanguage(serverConf.lang, "NewBuildSubmitted"));
        console.info(req.url);
        console.info(req.headers);

        buildMetrics.submitted++;

        if (queuedBuilds.length === maxBuildsInQueue) {
            var message = resources.getStringForLanguage(serverConf.lang, "BuildQueueFull", maxBuildsInQueue);
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

        // TODO: Check if any package can service the request
        requestRedirector.getPackageToServeRequest(null, req).then(function (pkg: TacoRemoteLib.IRemoteLib): void {
            pkg.init(serverConf);
            var errors: string[] = [];
            if (!pkg.validateBuildRequest(req, errors)) {
                callback(errors);
                buildMetrics.rejected++;
                return;
            }

            buildMetrics.accepted++;

            if (!buildNumber) {
                buildNumber = ++nextBuildNumber;
            }

            var buildDir = path.join(baseBuildDir, "" + buildNumber);
            if (!fs.existsSync(buildDir)) {
                fs.mkdirSync(buildDir);
            }

            console.info(resources.getString("BuildManagerDirInit", buildDir));

            // Pass the build query to the buildInfo, for package-specific config options
            var params = req.query;
            params.status = utils.BuildInfo.UPLOADING;
            params.buildCommand = buildCommand;
            params.buildPlatform = buildPlatform;
            params.configuration = configuration;
            params.buildLang = req.headers["accept-language"];
            params.buildDir = buildDir;
            params.buildNumber = buildNumber;
            params.options = options;
            var buildInfo = new utils.BuildInfo(params);
            // Associate the buildInfo object with the package used to service it, but without changing the JSON representation;
            Object.defineProperty(buildInfo, "pkg", { enumerable: false, writable: true, configurable: true });
            buildInfo["pkg"] = pkg;

            builds[buildNumber] = buildInfo;

            saveUploadedTgzFile(buildInfo, req, function (err: any, result: any): void {
                if (err) {
                    callback(err);
                } else {
                    callback(null, buildInfo);
                    beginBuild(req, buildInfo);
                }
            });
        }).done();
    }

    export function getBuildInfo(id: number): utils.BuildInfo {
        return builds[id] || null;
    }

    // TODO: Does this localize builds appropriately?
    export function downloadBuildLog(id: number, offset: number, res: express.Response): void {
        var buildInfo = builds[id];
        if (!buildInfo) {
            res.end();
            return;
        }

        var buildLog = path.join(buildInfo.buildDir, "build.log");
        if (!fs.existsSync(buildLog)) {
            res.end();
            return;
        }

        var logStream = fs.createReadStream(buildLog, { start: offset });
        logStream.on("error", function (err: any): void {
            console.info(resources.getString("LogFileReadError"));
            console.info(err);
        });
        logStream.pipe(res);
    };

    // TODO: This won't localize the builds
    export function getAllBuildInfo(): { metrics: any; queued: number; currentBuild: utils.BuildInfo; queuedBuilds: utils.BuildInfo[]; allBuilds: any } {
        return {
            metrics: buildMetrics,
            queued: queuedBuilds.length,
            currentBuild: currentBuild,
            queuedBuilds: queuedBuilds,
            allBuilds: builds
        };
    };

    // Downloads the requested build.
    export function downloadBuild(buildInfo: utils.BuildInfo, req: express.Request, res: express.Response): void {
        requestRedirector.getPackageToServeRequest(buildInfo, req).then(function (pkg: TacoRemoteLib.IRemoteLib): void {
            pkg.downloadBuild(buildInfo, req, res, function (err: any): void {
                if (!err) {
                    buildMetrics.downloaded++;
                    buildInfo.updateStatus(utils.BuildInfo.DOWNLOADED);
                }
            });
        });
    };

    export function getBaseBuildDir(): string {
        return baseBuildDir;
    }

    export function emulateBuild(buildInfo: utils.BuildInfo, req: express.Request, res: express.Response): void {
        if (!utils.UtilHelper.argToBool(serverConf.allowsEmulate)) {
            res.status(403).send(resources.getStringForLanguage(req, "EmulateDisabled"));
            return;
        }

        requestRedirector.getPackageToServeRequest(buildInfo, req).then(function (pkg: TacoRemoteLib.IRemoteLib): void {
            pkg.emulateBuild(buildInfo, req, res);
        });
    }

    export function deployBuild(buildInfo: utils.BuildInfo, req: express.Request, res: express.Response): void {
        requestRedirector.getPackageToServeRequest(buildInfo, req).then(function (pkg: TacoRemoteLib.IRemoteLib): void {
            pkg.deployBuild(buildInfo, req, res);
        });
    }

    export function runBuild(buildInfo: utils.BuildInfo, req: express.Request, res: express.Response): void {
        requestRedirector.getPackageToServeRequest(buildInfo, req).then(function (pkg: TacoRemoteLib.IRemoteLib): void {
            pkg.runBuild(buildInfo, req, res);
        });
    }

    export function debugBuild(buildInfo: utils.BuildInfo, req: express.Request, res: express.Response): void {
        requestRedirector.getPackageToServeRequest(buildInfo, req).then(function (pkg: TacoRemoteLib.IRemoteLib): void {
            pkg.debugBuild(buildInfo, req, res);
        });
    }

    function saveUploadedTgzFile(buildInfo: utils.BuildInfo, req: express.Request, callback: Function): void {
        console.info(resources.getString("UploadSaving", buildInfo.buildDir));
        buildInfo.tgzFilePath = path.join(buildInfo.buildDir, "upload_" + buildInfo.buildNumber + ".tgz");
        var tgzFile = fs.createWriteStream(buildInfo.tgzFilePath);
        req.pipe(tgzFile);
        tgzFile.on("finish", function (): void {
            buildInfo.updateStatus(utils.BuildInfo.UPLOADED);
            console.info(resources.getString("UploadSavedSuccessfully", buildInfo.tgzFilePath));
            callback(null, buildInfo);
        });
        tgzFile.on("error", function (err: Error): void {
            buildInfo.updateStatus(utils.BuildInfo.ERROR, "ErrorSavingTgz", tgzFile, err.message);
            console.error(resources.getString("ErrorSavingTgz", tgzFile, err));
            buildMetrics.failed++;
            callback(err, buildInfo);
        });
    }

    function beginBuild(req: express.Request, buildInfo: utils.BuildInfo): void {
        var extractToDir = path.join(buildInfo.buildDir, "cordovaApp");
        buildInfo.buildSuccessful = false;
        buildInfo.appDir = extractToDir;
        try {
            if (!fs.existsSync(extractToDir)) {
                fs.mkdirSync(extractToDir);
            }
        } catch (e) {
            buildInfo.updateStatus(utils.BuildInfo.ERROR, resources.getStringForLanguage(req, "FailedCreateDirectory", extractToDir, e.message));
            console.error(resources.getStringForLanguage(serverConf.lang, "FailedCreateDirectory", extractToDir, e.message));
            buildMetrics.failed++;
            return;
        }

        if (!fs.existsSync(buildInfo.tgzFilePath)) {
            buildInfo.updateStatus(utils.BuildInfo.ERROR, resources.getStringForLanguage(req, "NoTgzFound", buildInfo.tgzFilePath));
            console.error(resources.getStringForLanguage(serverConf.lang, "NoTgzFound", buildInfo.tgzFilePath));
            buildMetrics.failed++;
            return;
        }

        var onError = function (err: Error): void {
            buildInfo.updateStatus(utils.BuildInfo.ERROR, resources.getStringForLanguage(req, "TgzExtractError", buildInfo.tgzFilePath, err.message));
            console.info(resources.getStringForLanguage(serverConf.lang, "TgzExtractError", buildInfo.tgzFilePath, err.message));
            buildMetrics.failed++;
        };

        // A tar file created on windows has no notion of 'rwx' attributes on a directory, so directories are not executable when 
        // extracting to unix, causing the extract to fail because the directory cannot be navigated. 
        // Also, the tar module does not handle an 'error' event from it's underlying stream, so we have no way of catching errors like an unwritable
        // directory in the tar gracefully- they cause an uncaughtException and server shutdown. For safety sake we force 'rwx' for all on everything.
        var tarFilter = function (who: { props: { path: string; mode: number } }): boolean {
            who.props.mode = 511; // "chmod 777"
            return true;
        };

        // strip: 1 means take the top level directory name off when extracting (we want buildInfo.appDir to be the top level dir.)
        var tarExtractor = tar.Extract({ path: extractToDir, strip: 1, filter: tarFilter });
        tarExtractor.on("end", function (): void {
            removeDeletedFiles(buildInfo);

            buildInfo.updateStatus(utils.BuildInfo.EXTRACTED);
            console.info(resources.getString("UploadExtractedSuccessfully", extractToDir));
            build(buildInfo);
        });
        var unzip = zlib.createGunzip();
        var tgzStream = fs.createReadStream(buildInfo.tgzFilePath);
        tarExtractor.on("error", onError);
        unzip.on("error", onError);
        tgzStream.on("error", onError);
        tgzStream.pipe(unzip);
        unzip.pipe(tarExtractor).on("error", onError);
    }

    function removeDeletedFiles(buildInfo: utils.BuildInfo): void {
        var changeListFile = path.join(buildInfo.appDir, "changeList.json");
        if (fs.existsSync(changeListFile)) {
            buildInfo.changeList = JSON.parse(fs.readFileSync(changeListFile, { encoding: "utf-8" }));
            if (buildInfo.changeList) {
                buildInfo.changeList.deletedFiles.forEach(function (deletedFile: string): void {
                    var fileToDelete: string = path.join(buildInfo.appDir, path.normalize(deletedFile));

                    if (fs.existsSync(fileToDelete)) {
                        fs.unlinkSync(fileToDelete);
                    }
                });
            }
        }
    }

    // build may change the current working directory to the app dir. To build multiple builds in parallel we will
    // need to fork out child processes. For now, limiting to one build at a time, and queuing up new builds that come in while a current build is in progress.
    function build(buildInfo: utils.BuildInfo): void {
        if (currentBuild) {
            console.info(resources.getString("NewBuildQueued", buildInfo.buildNumber));
            queuedBuilds.push(buildInfo);
            return;
        } else {
            console.info(resources.getString("NewBuildStarted", buildInfo.buildNumber));
            currentBuild = buildInfo;
        }

        // Good point to purge old builds
        buildRetention.purge(builds);

        if (!fs.existsSync(buildInfo.appDir)) {
            console.info(resources.getString("BuildDirectoryNotFound", buildInfo.buildDir));
            buildInfo.updateStatus(utils.BuildInfo.ERROR, "BuildDirectoryNotFound", buildInfo.buildDir);
            buildMetrics.failed++;
            dequeueNextBuild();
            return;
        }

        requestRedirector.getPackageToServeRequest(buildInfo, null).then(function (pkg: TacoRemoteLib.IRemoteLib): void {
            pkg.build(buildInfo, function (resultBuildInfo: utils.BuildInfo): void {
                buildInfo.updateStatus(resultBuildInfo.status, resultBuildInfo.messageId, resultBuildInfo.messageArgs);
                if (buildInfo.status === utils.BuildInfo.COMPLETE) {
                    buildMetrics.succeeded++;
                    buildInfo.buildSuccessful = true;
                } else if (buildInfo.status === utils.BuildInfo.INVALID) {
                    buildMetrics.rejected++;
                } else {
                    buildMetrics.failed++;
                }

                dequeueNextBuild();
            });
        });
    }

    function dequeueNextBuild(): void {
        console.info(resources.getString("BuildMovingOn"));
        currentBuild = null;
        var nextBuild = queuedBuilds.shift();
        if (nextBuild) {
            build(nextBuild);
        }
    }
}

export = BuildManager;