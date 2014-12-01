/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import child_process = require('child_process');
import express = require('express');
import fs = require('fs');
import nconf = require('nconf');
import path = require('path');
import semver = require('semver');
import tar = require('tar');
import zlib = require('zlib');

import bi = require('./buildInfo');
import buildLogger = require('./buildLogger');
import buildRetention = require('./buildRetention');
import CordovaConfig = require('./cordovaConfig');
import OSSpecifics = require('./OSSpecifics');
import resources = require('./resources');
import util = require('./util');

var osSpecifics = OSSpecifics.osSpecifics;

module BuildManager {
    export interface Conf {
        get(prop: string): any;
    }

    var baseBuildDir: string,
        maxBuildsInQueue: number,
        nextBuildNumber: number,
        deleteBuildsOnShutdown: boolean,
        builds: { [idx: string]: bi.BuildInfo },
        currentBuild: bi.BuildInfo,
        queuedBuilds: bi.BuildInfo[],
        installedCordovaVersion: string,
        buildMetrics: {
            submitted: number;
            accepted: number;
            rejected: number;
            failed: number;
            succeeded: number;
            downloaded: number;
        };

    var allowsEmulate,
        nativeDebugProxyPort,
        webDebugProxyDevicePort,
        webDebugProxyPortMin,
        webDebugProxyPortMax;

    export function init(conf: Conf): void {
        baseBuildDir = path.resolve(process.cwd(), conf.get('serverDir'), 'builds');
        util.createDirectoryIfNecessary(baseBuildDir);
        maxBuildsInQueue = conf.get('maxBuildsInQueue');
        deleteBuildsOnShutdown = util.argToBool(conf.get('deleteBuildsOnShutdown'));

        // TODO: Move these to an OS-specific section? Need to decide what we support cross-platform
        allowsEmulate = util.argToBool(conf.get('allowsEmulate'));
        nativeDebugProxyPort = conf.get('nativeDebugProxyPort');
        webDebugProxyDevicePort = conf.get('webDebugProxyDevicePort');
        webDebugProxyPortMin = conf.get('webDebugProxyRangeMin');
        webDebugProxyPortMax = conf.get('webDebugProxyRangeMax');
        if (allowsEmulate === true) {
            require('./emulate').init();
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
        installedCordovaVersion = require('cordova/package.json').version;
        console.info(resources.getString(conf.get("lang"), "BuildManagerInit"),
            installedCordovaVersion, baseBuildDir, maxBuildsInQueue, deleteBuildsOnShutdown, allowsEmulate, nextBuildNumber);
    }

    export function shutdown(): void {
        if (deleteBuildsOnShutdown === true) {
            buildRetention.deleteAllSync(builds);
        }
    }

    export function submitNewBuild(req: express.Request, callback: Function) {
        console.info(resources.getString(nconf.get("lang"), "NewBuildSubmitted"));
        console.info(req.url);
        console.info(req.headers);

        buildMetrics.submitted++;

        if (queuedBuilds.length === maxBuildsInQueue) {
            var message = resources.getString(nconf.get('lang'), 'BuildQueueFull', maxBuildsInQueue);
            var error : any = new Error(message);
            error.code = 503;
            throw error;
        }

        // For now these are part of the request query (after the ?) but might look to make these part of the path, or headers, as most are not really optional parameters
        var cordovaVersion : string = req.query.vcordova || null;
        var buildCommand: string = req.query.command || 'build';
        var configuration: string  = req.query.cfg || 'release';
        var options: string  = req.query.options || '';
        var buildNumber: number = req.query.buildNumber || null;

        var requestErrors = validateBuildRequest(req.headers['accept-language'], cordovaVersion, buildCommand, configuration);
        if (requestErrors.length > 0) {
            callback(requestErrors);
            buildMetrics.rejected++;
            return;
        }
        buildMetrics.accepted++;

        if (!buildNumber) {
            buildNumber = ++nextBuildNumber;
        }
        var buildDir = path.join(baseBuildDir, '' + buildNumber);
        if (!fs.existsSync(buildDir)) {
            fs.mkdirSync(buildDir);
        }
        console.info('Build will be executed under: ' + buildDir);

        var buildInfo = new bi.BuildInfo(buildNumber, bi.UPLOADING, cordovaVersion, buildCommand, configuration, options, buildDir);
        builds[buildNumber] = buildInfo;

        saveUploadedTgzFile(buildInfo, req, function (err, result) {
            if (err) {
                callback(err);
            } else {
                callback(null, buildInfo);
                beginBuild(req, buildInfo);
            }
        });
    }

    export function getBuildInfo(id: number): bi.BuildInfo {
        return builds[id] || null;
    }

    // TODO: Does this localize builds appropriately?
    export function downloadBuildLog(id: number, res: express.Response) : void{
        var buildInfo = builds[id];
        if (buildInfo === null) {
            res.end();
            return;
        }
        var buildLog = path.join(buildInfo.buildDir, 'build.log');
        if (!fs.existsSync(buildLog)) {
            res.end();
            return;
        }
        var logStream = fs.createReadStream(buildLog);
        logStream.on('error', function (err) {
            console.info('Error from reading build log file ' + buildLog + ': ' + err);
        });
        logStream.pipe(res);
    };

    // TODO: This won't localize the builds
    export function getAllBuildInfo() {
        return {
            metrics: buildMetrics,
            queued: queuedBuilds.length,
            currentBuild: currentBuild,
            queuedBuilds: queuedBuilds,
            allBuilds: builds
        };
    };

    // Downloads the requested build.
    export function downloadBuild(id: number, req: express.Request, res: express.Response, callback: Function) {
        console.info('Downloading build ' + id + ' ...');
        var buildInfo = builds[id];
        if (buildInfo === null) {
            var msg = 'Unknown build ' + id + ' in downloadBuild request';
            console.info(msg);
            callback(msg);
            return;
        }
        else if (buildInfo.status !== bi.COMPLETE && buildInfo.status !== bi.DOWNLOADED) {
            console.info(resources.getString(nconf.get('lang'), "BuildNotReadyForDownload", buildInfo.status));
            callback(resources.getString(req,"BuildNotReadyForDownload", buildInfo.status), buildInfo);
            return;
        }
        osSpecifics.downloadBuild(buildInfo, req, res, function (err, succ) {
            if (!err) {
                buildMetrics.downloaded++;
                buildInfo.updateStatus(bi.DOWNLOADED);
            }
            callback(err, succ);
        });
    };

    function validateBuildRequest(acceptLangsHeader: string, cordovaVersion: string, buildCommand: string, configuration: string) : string[]{
        var errors : string[] = [];
        if (cordovaVersion === null) {
            errors.push(resources.getString(acceptLangsHeader, 'BuildRequestMissingCordovaVersion'));
        } else if (semver.gt(cordovaVersion, installedCordovaVersion)) {
            errors.push(resources.getString(acceptLangsHeader, 'BuildRequestUnsupportedCordovaVersion', [cordovaVersion, installedCordovaVersion]));
        }
        if (buildCommand !== 'build') {
            errors.push(resources.getString(acceptLangsHeader, 'BuildRequestUnsupportedCommand', buildCommand));
        }
        if (configuration !== 'debug' && configuration !== 'release' && configuration !== 'distribution') {
            errors.push(resources.getString(acceptLangsHeader, 'BuildRequestUnsupportedConfiguration', configuration));
        }
        return errors;
    }

    function saveUploadedTgzFile(buildInfo: bi.BuildInfo, req: express.Request, callback: Function) {
        console.info('Saving build request payload to : ' + buildInfo.buildDir);
        buildInfo.tgzFilePath = path.join(buildInfo.buildDir, 'upload_' + buildInfo.buildNumber + '.tgz');
        var tgzFile = fs.createWriteStream(buildInfo.tgzFilePath);
        req.pipe(tgzFile);
        tgzFile.on('finish', function () {
            buildInfo.updateStatus(bi.UPLOADED);
            console.info('Saved upload to ' + buildInfo.tgzFilePath);
            callback(null, buildInfo);
        });
        tgzFile.on('error', function (err) {
            buildInfo.updateStatus(bi.ERROR, 'An error occurred in saving the uploaded tgz file to ' + tgzFile + ': ' + err.message);
            console.error('Could not save the uploaded tgz file to ' + tgzFile + ' : ' + err);
            buildMetrics.failed++;
            callback(err, buildInfo);
        });
    }

    function beginBuild(req: express.Request, buildInfo: bi.BuildInfo) : void {
        var extractToDir = path.join(buildInfo.buildDir, 'cordovaApp');
        try {
            if (!fs.existsSync(extractToDir)) {
                fs.mkdirSync(extractToDir);
            }
        } catch (e) {
            buildInfo.updateStatus(bi.ERROR, resources.getString(req, "FailedCreateDirectory",extractToDir, e.message));
            console.error(resources.getString(nconf.get("lang"), "FailedCreateDirectory", extractToDir, e.message));
            buildMetrics.failed++;
            return;
        }

        console.info('Extracting ' + buildInfo.tgzFilePath + ' to ' + extractToDir + '...');
        if (!fs.existsSync(buildInfo.tgzFilePath)) {
            buildInfo.updateStatus(bi.ERROR, resources.getString(req, "NoTgzFound", buildInfo.tgzFilePath));
            console.error(resources.getString(nconf.get("lang"), "NoTgzFound", buildInfo.tgzFilePath));
            buildMetrics.failed++;
            return;
        }
        var onError = function (err) {
            buildInfo.updateStatus(bi.ERROR, resources.getString(req, "TgzExtractError", buildInfo.tgzFilePath, err.message));
            console.info(resources.getString(nconf.get('lang'), "TgzExtractError", buildInfo.tgzFilePath, err.message));
            buildMetrics.failed++;
        };

        // A tar file created on windows has no notion of 'rwx' attributes on a directory, so directories are not executable when 
        // extracting to unix, causing the extract to fail because the directory cannot be navigated. 
        // Also, the tar module does not handle an 'error' event from it's underlying stream, so we have no way of catching errors like an unwritable
        // directory in the tar gracefully- they cause an uncaughtException and server shutdown. For safety sake we force 'rwx' for all on everything.
        var tarFilter = function (who) {
            if (path.basename(who.props.path) === 'config.json' && path.basename(path.dirname(who.props.path)) === '.cordova') {
                // Not extracting .cordova/config.json. It is used on individual developer machines to customize locations of libraries and will not work on a remote machine.
                return false;
            }
            who.props.mode = 511; // "chmod 777"
            return true;
        }

    // strip: 1 means take the top level directory name off when extracting (we want 'cordovaApp' to be the top level dir.)
    var tarExtractor = tar.Extract({ path: extractToDir, strip: 1, filter: tarFilter });
        tarExtractor.on('end', function () {
            removeDeletedFiles(buildInfo);

            buildInfo.updateStatus(bi.EXTRACTED);
            console.info('Extracted app contents from uploaded build request to %s. Requesting build.', extractToDir);
            build(buildInfo);
        });
        var unzip = zlib.createGunzip();
        var tgzStream = fs.createReadStream(buildInfo.tgzFilePath);
        tarExtractor.on('error', onError);
        unzip.on('error', onError);
        tgzStream.on('error', onError);
        tgzStream.pipe(unzip);
        unzip.pipe(tarExtractor).on('error', onError);
    }

    function removeDeletedFiles(buildInfo: bi.BuildInfo) : void {
        var cordovaDir = path.join(buildInfo.buildDir, 'cordovaApp');
        var changeListFile = path.join(cordovaDir, 'changeList.json');
        if (fs.existsSync(changeListFile)) {
            buildInfo.changeList = JSON.parse(fs.readFileSync(changeListFile, { encoding: 'utf-8' }));
            if (buildInfo.changeList) {
                buildInfo.changeList.deletedFiles.forEach(function (deletedFile) {
                    var fileToDelete;

                    if (deletedFile.indexOf('merges') != 0 &&
                        deletedFile.indexOf('res') != 0) {
                        fileToDelete = path.join(cordovaDir, 'www', deletedFile).replace(/\\/g, path.sep);
                    } else {
                        fileToDelete = path.join(cordovaDir, deletedFile).replace(/\\/g, path.sep);
                    }

                    if (fs.existsSync(fileToDelete)) {
                        fs.unlinkSync(fileToDelete);
                    }
                });
            }
        }
    }

    // Cordova build relies on changing current working directory to the cordova app dir. To build multiple builds in parallel we will
    // need to fork out child processes. For now, limiting to one build at a time, and queuing up new builds that come in while a current build is in progress.
    function build(buildInfo: bi.BuildInfo) : void{
        if (currentBuild !== null) {
            console.info('A build is currently building. Queuing up ' + buildInfo.buildNumber);
            queuedBuilds.push(buildInfo);
            return;
        } else {
            console.info('Taking ' + buildInfo.buildNumber + ' as current build');
            currentBuild = buildInfo;
        }

        // Good point to purge old builds
        buildRetention.purge(builds);

        buildInfo.appDir = path.join(buildInfo.buildDir, 'cordovaApp');
        if (!fs.existsSync(buildInfo.appDir)) {
            var msg = 'Build directory ' + buildInfo.buildDir + ' does not exist.';
            console.info(msg);
            buildInfo.updateStatus(bi.ERROR, msg);
            buildMetrics.failed++;
            dequeueNextBuild();
            return;
        }

        var cordovaAppError = validateCordovaApp(buildInfo.appDir);
        if (cordovaAppError !== null) {
            buildMetrics.rejected++;
            buildInfo.updateStatus(bi.INVALID, cordovaAppError.id, cordovaAppError.args);
            console.info('Not building buildNumber [' + buildInfo.buildNumber + '] because it is not a valid Cordova Application: ' + cordovaAppError);
            dequeueNextBuild();
            return;
        }

        var cfg = new CordovaConfig(path.join(buildInfo.appDir, 'config.xml'));
        buildInfo.appName = cfg.name();

        console.info('Building cordova app %s at appDir %s', buildInfo.appName, buildInfo.appDir);
        buildInfo.updateStatus(bi.BUILDING);

        // Fork off to a child build process. This allows us to save off all stdout for that build to it's own log file. And in future we can 
        // have multiple builds in parallel by forking multiple child processes (with some max limit.)
        var buildProcess = osSpecifics.createBuildProcess();
        var buildLogger = new buildLogger.BuildLogger();
        buildLogger.begin(buildInfo.buildDir, 'build.log', buildProcess);
        buildProcess.send({ buildInfo: buildInfo, language: nconf.get('lang')}, undefined);
        buildProcess.on('message', function (resultBuildInfo: bi.BuildInfo) {
            buildInfo.updateStatus(resultBuildInfo.status, resultBuildInfo.messageId, resultBuildInfo.messageArgs);
            console.info('Done building %d : %s %s', buildInfo.buildNumber, buildInfo.status, buildInfo.messageId, buildInfo.messageArgs);
            if (buildInfo.status === bi.COMPLETE) {
                buildMetrics.succeeded++;
            } else {
                buildMetrics.failed++;
            }
            buildProcess.kill();
            buildLogger.end();
            dequeueNextBuild();
        });
        buildProcess.on('exit', function (exitCode) {
            if (buildInfo.status === bi.BUILDING) {
                buildInfo.updateStatus(bi.ERROR, 'BuildFailedWithError', 'Build process unexpectedly exited');
                buildMetrics.failed++;
                buildLogger.end();
                dequeueNextBuild();
            }
        });
    }

    // This is basic validation. The build itself will fail if config.xml is not valid, or more detailed problems with the submission.
    function validateCordovaApp(appDir: string): { id: string; args?: any[]}{
        if (!fs.existsSync(path.join(appDir, 'config.xml'))) {
            return { id: 'InvalidCordovaAppMissingConfigXml' };
        } else {
            try {
                var cfg = new CordovaConfig(path.join(currentBuild.appDir, 'config.xml'));
                var appName = cfg.name();
                if (!util.isValidCordovaAppName(appName)) {
                    return { id: 'InvalidCordovaAppUnsupportedAppName', args: [appName, util.invalidAppNameCharacters()] };
                    //errors.push('Invalid iOS app name ' + appName + ' in config.xml. Check for characters that are not Printable ASCII, or that match any of the following characters: ' + util.invalidAppNameCharacters());
                }
                // TODO validate that start page exists (content src='index.html')
            } catch (e) {
                return { id: 'InvalidCordovaAppBadConfigXml', args: e.message };
            }
        }

        if (!fs.existsSync(path.join(appDir, 'www'))) {
            return { id: 'InvalidCordovaAppMissingWww' };
        }

        return null;
    }

    function dequeueNextBuild() {
        console.info('Done with currentBuild. Checking for next build in queue.');
        currentBuild = null;
        var nextBuild = queuedBuilds.shift();
        if (nextBuild) {
            console.info('Dequeued ' + nextBuild.buildNumber + ' and will build that next');
            build(nextBuild);
        }
    }
}

export = BuildManager;