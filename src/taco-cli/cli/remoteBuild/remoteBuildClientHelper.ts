/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */
/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/request.d.ts" />
/// <reference path="../../../typings/fstream.d.ts" />
/// <reference path="../../../typings/tar.d.ts" />
/// <reference path="../../../typings/tacoUtils.d.ts" />
/// <reference path="../../../typings/adm-zip.d.ts" />
"use strict";

import AdmZip = require("adm-zip");
import fs = require("fs");
import fstream = require("fstream");
import https = require("https");
import path = require("path");
import Q = require("q");
import querystring = require("querystring");
import request = require("request");
import tar = require("tar");
import util = require("util");
import zlib = require("zlib");

import BuildSettings = require("./buildSettings");
import ConnectionSecurityHelper = require("./connectionSecurityHelper");
import Settings = require("../utils/settings");
import tacoUtils = require("taco-utils");
import BuildInfo = tacoUtils.BuildInfo;
import CountStream = tacoUtils.CountStream;
import res = tacoUtils.ResourcesManager;
import UtilHelper = tacoUtils.UtilHelper;

class RemoteBuildClientHelper {
    public static PingInterval: number = 5000;

    /**
     * Submit a build to a remote build server, poll for completion, print the build log when the build completes, and if building for a device then download the end result
     */
    public static build(settings: BuildSettings): Q.Promise<BuildInfo> {
        var outputBuildDir: string = settings.platformConfigurationBldDir;
        var buildInfoFilePath = path.join(outputBuildDir, "buildInfo.json");

        if (!RemoteBuildClientHelper.isValidBuildServerUrl(settings.buildServerUrl)) {
            throw new Error(res.getString("InvalidRemoteBuildUrl", settings.buildServerUrl, 1));
        }

        var changeTimeFile = path.join(settings.platformConfigurationBldDir, "lastChangeTime.json");
        var lastChangeTime: { [file: string]: number } = {};

        var promise: Q.Promise<any> = RemoteBuildClientHelper.checkForBuildOnServer(settings, buildInfoFilePath)
            .then(function (buildInfo: BuildInfo): void {
            settings.incrementalBuild = buildInfo ? buildInfo.buildNumber : null;

            console.info(res.getString("IncrementalBuild", !!settings.incrementalBuild));
            if (!settings.incrementalBuild) {
                try {
                    fs.unlinkSync(changeTimeFile);
                } catch (e) {
                    // File didn't exist, or other error we can't do much about
                }
            }

            var platformJsonFile = path.join(settings.projectSourceDir, "plugins", util.format("remote_%s.json", settings.platform));
            if (fs.existsSync(platformJsonFile)) {
                fs.unlinkSync(platformJsonFile);
            }
        })
            .then(function (): Q.Promise<zlib.Gzip> {
            return RemoteBuildClientHelper.appAsTgzStream(settings, lastChangeTime, changeTimeFile);
        })
            .then(function (tgz: zlib.Gzip): Q.Promise<string> {
            return RemoteBuildClientHelper.submitBuildRequestToServer(settings, tgz);
        })
            .then(function (buildingUrl: string): Q.Promise<BuildInfo> {
            return RemoteBuildClientHelper.pollForBuildComplete(settings, buildingUrl, RemoteBuildClientHelper.PingInterval, 0);
        })
            .then(function (result: BuildInfo): Q.Promise<BuildInfo> {
            if (result.buildNumber) {
                console.info(res.getString("RemoteBuildSuccessful"));
                return RemoteBuildClientHelper.logBuildOutput(result, settings);
            }
        }, function (err: any): Q.Promise<BuildInfo> {
                if (err.buildInfo) {
                    // If we successfully submitted a build but the remote build server reports an error about the build, then grab the
                    // build log from the remote machine before propagating the reported failure
                    console.info(res.getString("RemoteBuildUnSuccessful"));
                    return RemoteBuildClientHelper.logBuildOutput(err.buildInfo, settings)
                        .then(function (buildInfo: BuildInfo): Q.Promise<BuildInfo> {
                        throw err;
                    });
                }

                throw err;
            })
            .then(function (buildInfo: BuildInfo): Q.Promise<BuildInfo> {
            return RemoteBuildClientHelper.downloadRemotePluginFile(buildInfo, settings, path.join(settings.projectSourceDir, "plugins"));
        })
            .then(function (buildInfo: BuildInfo): BuildInfo {
            UtilHelper.createDirectoryIfNecessary(outputBuildDir);
            fs.writeFileSync(buildInfoFilePath, JSON.stringify(buildInfo));
            fs.writeFileSync(changeTimeFile, JSON.stringify(lastChangeTime));
                
            return buildInfo;
        });

        // If build is for a device we will download the build as a zip with the build output in it
        if (RemoteBuildClientHelper.isDeviceBuild(settings)) {
            promise = promise
                .then(function (buildInfo: BuildInfo): Q.Promise<BuildInfo> {
                return RemoteBuildClientHelper.downloadBuild(buildInfo, settings, outputBuildDir)
                    .then(function (zipFile: string): Q.Promise<{}> {
                    return RemoteBuildClientHelper.unzipBuildFiles(zipFile, outputBuildDir);
                }).then(function (): BuildInfo {
                    return buildInfo;
                });
            });
        }

        return promise;
    }

    public static run(buildInfo: BuildInfo, serverSettings: Settings.IRemoteConnectionInfo): Q.Promise<BuildInfo> {
        var buildUrlBase = Settings.getRemoteServerUrl(serverSettings) + "/build/" + buildInfo.buildNumber;
        var httpSettings = { language: buildInfo.buildLang, agent: ConnectionSecurityHelper.getAgent(serverSettings) };

        return RemoteBuildClientHelper.httpOptions(buildUrlBase + "/deploy", httpSettings).then(RemoteBuildClientHelper.promiseForHttpGet)
            .then(function (): Q.Promise<{ response: any; body: string }> {
            return RemoteBuildClientHelper.httpOptions(buildUrlBase + "/run", httpSettings).then(RemoteBuildClientHelper.promiseForHttpGet);
        }).then(function (responseAndBody: { response: any; body: string }): BuildInfo {
            return BuildInfo.createNewBuildInfoFromDataObject(JSON.parse(responseAndBody.body));
        });
    }

    public static emulate(buildInfo: BuildInfo, serverSettings: Settings.IRemoteConnectionInfo, target: string): Q.Promise<BuildInfo> {
        var buildUrlBase = Settings.getRemoteServerUrl(serverSettings) + "/build/" + buildInfo.buildNumber;
        var httpSettings = { language: buildInfo.buildLang, agent: ConnectionSecurityHelper.getAgent(serverSettings) };
        return RemoteBuildClientHelper.httpOptions(buildUrlBase + "/emulate?" + querystring.stringify({ target: target }), httpSettings).then(RemoteBuildClientHelper.promiseForHttpGet)
            .then(function (responseAndBody: { response: any; body: string }): BuildInfo {
            return BuildInfo.createNewBuildInfoFromDataObject(JSON.parse(responseAndBody.body));
        });
    }

    public static debug(buildInfo: BuildInfo, serverSettings: Settings.IRemoteConnectionInfo): Q.Promise<BuildInfo> {
        var buildUrlBase = Settings.getRemoteServerUrl(serverSettings) + "/build/" + buildInfo.buildNumber;
        var httpSettings = { language: buildInfo.buildLang, agent: ConnectionSecurityHelper.getAgent(serverSettings) };
        return RemoteBuildClientHelper.httpOptions(buildUrlBase + "/debug", httpSettings).then(RemoteBuildClientHelper.promiseForHttpGet).then(function (responseAndBody: { response: any; body: string }): BuildInfo {
            return BuildInfo.createNewBuildInfoFromDataObject(JSON.parse(responseAndBody.body));
        });
    }

    /**
     * Try to find whether the server has a previous build of this project
     */
    public static checkForBuildOnServer(settings: BuildSettings, buildInfoFilePath: string): Q.Promise<BuildInfo> {
        var deferred = Q.defer<BuildInfo>();

        // If we don't have a buildInfo.json file then we cannot query the server.
        if (!fs.existsSync(buildInfoFilePath)) {
            deferred.resolve(null);
            return deferred.promise;
        }

        var buildInfo: BuildInfo;
        try {
            var fileContents: string = fs.readFileSync(buildInfoFilePath).toString();
            buildInfo = JSON.parse(fileContents);
        } catch (e) {
            deferred.resolve(null);
            return deferred.promise;
        }

        var buildNumber: number = buildInfo.buildNumber;

        var serverUrl = settings.buildServerUrl;
        var buildUrl = serverUrl + "/build/" + buildNumber;

        // If we do have a buildInfo.json, check whether the server still has that build number around
        return RemoteBuildClientHelper.httpOptions(buildUrl, settings).then(function (requestOptions: request.Options): Q.Promise<BuildInfo> {
            request.get((requestOptions), function (error: any, response: { statusCode: number }, body: string): void {
                if (error) {
                    deferred.reject(RemoteBuildClientHelper.errorFromRemoteBuildServer(serverUrl, error, "RemoteBuildError"));
                } else if (response.statusCode === 200) {
                    deferred.resolve(buildInfo);
                } else {
                    // Build was bad: remove outdated buildInfo file
                    try {
                        fs.unlinkSync(buildInfoFilePath);
                    } catch (e) {
                        // Ignore errors: not critical that we can remove the file
                    }

                    deferred.resolve(null);
                }
            });
            return deferred.promise;
        });
    }

    private static isValidBuildServerUrl(serverUrl: string): boolean {
        return (serverUrl.indexOf("http://") === 0 || serverUrl.indexOf("https://") === 0);
    }

    private static httpOptions(url: string, settings: { language: string; agent: Q.Promise<https.Agent> }): Q.Promise<request.Options> {
        return settings.agent.then(function (agent: https.Agent): request.Options {
            return {
                url: url,
                headers: { "Accept-Language": settings.language },
                agent: agent
            };
        });
    }

    /**
     * Convert errors from error codes to localizable strings
     */
    private static errorFromRemoteBuildServer(serverUrl: string, requestError: any, fallbackErrorId: string): Error {
        if (requestError.toString().indexOf("CERT_") !== -1) {
            return new Error(res.getString("InvalidRemoteBuildClientCert"));
        } else if (serverUrl.indexOf("https://") === 0 && requestError.code === "ECONNRESET") {
            return new Error(res.getString("RemoteBuildSslConnectionReset", serverUrl));
        } else if (serverUrl.indexOf("http://") === 0 && requestError.code === "ECONNRESET") {
            return new Error(res.getString("RemoteBuildNonSslConnectionReset", serverUrl));
        } else if (requestError.code === "ENOTFOUND") {
            // Host unreachable regardless of whether http or https
            return new Error(res.getString("RemoteBuildHostNotFound", serverUrl));
        } else if (requestError.code === "ECONNREFUSED") {
            // Host reachable but connection not established (e.g. Server not running)
            return new Error(res.getString("RemoteBuildNoConnection", serverUrl));
        }

        return new Error(res.getString(fallbackErrorId, serverUrl, requestError));
    }

    /**
     * Create a gzipped tarball of the cordova project ready to submit to the server.
     */
    private static appAsTgzStream(settings: BuildSettings, lastChangeTime: { [file: string]: number }, changeTimeFile: string): Q.Promise<zlib.Gzip> {
        var projectSourceDir = settings.projectSourceDir;
        var changeListFile = path.join(projectSourceDir, "changeList.json");
        var newChangeTime: { [file: string]: number } = {};
        try {
            var json: { [file: string]: number } = JSON.parse(<any>fs.readFileSync(changeTimeFile));
            Object.keys(json).forEach(function (file: string): void {
                lastChangeTime[file] = json[file];
            });
        } catch (e) {
            // File is missing or malformed: no incremental build
        }

        var upToDateFiles: string[] = [];

        var filterForChanges = function (reader: fstream.Reader, props: any): boolean {
            var shouldInclude = RemoteBuildClientHelper.filterForRemote(settings, reader, lastChangeTime);
            var appRelPath = path.relative(settings.projectSourceDir, reader.path);
            if (shouldInclude) {
                var newmtime = reader.props.mtime.getTime();
                if (reader.props.type === "Directory" || !lastChangeTime[appRelPath] || lastChangeTime[appRelPath] !== newmtime) {
                    // If this is a directory, or a new file, or a file that has changed since we last looked, then include it
                    newChangeTime[appRelPath] = newmtime;
                    return true;
                }
            }

            // Either we did not want to include the file, or it has not changed
            if (appRelPath in lastChangeTime) {
                // It is a file that has not changed. Remember that, and do not include it.
                upToDateFiles.push(appRelPath);
            }

            return false;
        };

        var filterForTar = function (reader: fstream.Reader, props: any): boolean {
            var appRelPath = path.relative(settings.projectSourceDir, reader.path);
            return appRelPath === "changeList.json" || appRelPath in newChangeTime;
        };

        var deferred = Q.defer();

        var firstPassReader = new fstream.Reader({ path: projectSourceDir, type: "Directory", filter: filterForChanges });
        firstPassReader.on("close", function (): void {
            // We have now determined which files are new and which files are old. Construct changeList.json
            var previousFiles = Object.keys(lastChangeTime);

            var changeList: { deletedFiles: string[] } = {
                deletedFiles: previousFiles.filter(function (file: string): boolean {
                    return !(file in newChangeTime) && upToDateFiles.indexOf(file) === -1;
                })
            };            
            // Save the changeList.json file
            fs.writeFileSync(changeListFile, JSON.stringify(changeList));

            // Save the new modification times
            changeList.deletedFiles.forEach(function (file: string): void {
                // Stop tracking deleted files
                delete lastChangeTime[file];
            });
            Object.keys(newChangeTime).forEach(function (file: string): void {
                // Update the modification time of changed and new files
                lastChangeTime[file] = newChangeTime[file];
            });

            deferred.resolve({});
        });
        firstPassReader.on("error", function (err: Error): void {
            deferred.reject(err);
        });

        return deferred.promise.then(function (): zlib.Gzip {
            var projectSourceDirReader = new fstream.Reader({ path: projectSourceDir, type: "Directory", filter: filterForTar });
            var tgzProducingStream = projectSourceDirReader.pipe(tar.Pack()).pipe(zlib.createGzip());
            return tgzProducingStream;
        });
    }

    /**
     * Determine which files should be included in the tarball which is sent to the server.
     * We want to include all changed user data, and exclude all irrelevant metadata or data for different platforms
     */
    private static filterForRemote(settings: BuildSettings, reader: fstream.Reader, lastChangeTime: { [file: string]: number }): boolean {
        var appRelPath = path.relative(settings.projectSourceDir, reader.path);

        var exclusions = [
            "remote", // the /remote folder is for local tracking of remote builds, no need to send it to the remote server
            "platforms" // The /platforms folder is for locally installed platforms, and thus irrelevant to remote builds
        ];

        if (exclusions.indexOf(appRelPath) !== -1) {
            return false;
        }

        // We want to exclude /merges/<x> if x is not the current platform
        // Similarly for the others here
        var otherPlatformExclusions = [
            "merges",
            path.join("res", "screens"),
            path.join("res", "icons"),
            path.join("res", "cert"),
            path.join("res", "native")
        ];

        var shouldBeExcluded = function (exclusion: string): boolean {
            // If we are looking at <exclusion>\<basename> and basename is not the platform, then it should be excluded
            var checkFullPath = path.join(exclusion, reader.basename);
            return reader.basename !== settings.platform && !!appRelPath.match(new RegExp("^" + checkFullPath + "$"));
        };

        if (appRelPath && otherPlatformExclusions.some(shouldBeExcluded)) {
            return false;
        }

        if (settings.incrementalBuild && appRelPath) {
            var stat = fs.statSync(reader.path);
            if (stat.isDirectory()) {
                // Consider all directories, since their contents may be modified
                return true;
            }

            if (appRelPath === "changeList.json") {
                // Always include changeList.json
                return true;
            }

            if (appRelPath in lastChangeTime && lastChangeTime[appRelPath] === stat.mtime.getTime()) {
                // If we know when the file was last modified, and it hasn't been changed since then, we must have sent this file to the server already.
                return false;
            }
        }

        return true;
    }

    /*
     * Submit a new build request to the remote server, including the project to be compiled as a tarball attached to the POST
     */
    private static submitBuildRequestToServer(settings: BuildSettings, appAsTgzStream: zlib.Gzip): Q.Promise<string> {
        var serverUrl: string = settings.buildServerUrl;
        var vcordova: string = settings.cordovaVersion;
        var cfg: string = settings.configuration ? settings.configuration.toLowerCase() : "release";
        var cliVersion: string = require("../../package.json").version;

        var deferred = Q.defer<string>();
        var params: { [idx: string]: string } = {
            command: "build",
            vcordova: vcordova,
            vcli: cliVersion,
            cfg: cfg,
            platform: settings.platform
        };

        if (RemoteBuildClientHelper.isDeviceBuild(settings)) {
            params["options"] = "--device";
        }

        if (settings.incrementalBuild) {
            params["buildNumber"] = settings.incrementalBuild.toString();
        }

        var buildUrl = serverUrl + "/build/tasks?" + querystring.stringify(params);
        console.info(res.getString("SubmittingRemoteBuild", buildUrl));

        appAsTgzStream.on("error", function (error: any): void {
            deferred.reject(new Error(res.getString("ErrorUploadingRemoteBuild", serverUrl, error)));
        });
        return RemoteBuildClientHelper.httpOptions(buildUrl, settings).then(function (requestOptions: request.Options): Q.Promise<string> {
            appAsTgzStream.pipe(request.post(requestOptions, function (error: any, response: any, body: any): void {
                if (error) {
                    deferred.reject(RemoteBuildClientHelper.errorFromRemoteBuildServer(serverUrl, error, "ErrorUploadingRemoteBuild"));
                } else if (response.statusCode === 400) {
                    // Build server sends back http 400 for invalid submissions with response like this. We will fail the build with a formatted message.
                    // {"status": "Invalid build submission", "errors": ["The requested cordova version 3.5.0-0.2.4 is not supported by this build manager. Installed cordova version is 3.4.1-0.1.0"]}
                    var errorsJson: { status: string; errors: string[] } = JSON.parse(body);
                    deferred.reject(new Error(errorsJson.status + ": " + errorsJson.errors.toString()));
                } else if (response.statusCode === 202) {
                    // Expect http 202 for a valid submission which is "Accepted" with a content-location to the Url to check for build status
                    console.info(res.getString("NewRemoteBuildInfo", body));
                    var buildInfo = JSON.parse(body);
                    deferred.resolve(response.headers["content-location"]);
                } else {
                    deferred.reject(new Error(body));
                }
            }));

            return deferred.promise;
        });
    }

    private static isDeviceBuild(settings: BuildSettings): boolean {
        return settings.buildTarget && !!settings.buildTarget.match(/device/i);
    }

    /*
     * Status progression: uploaded -> extracted -> building -> [complete|invalid|error] -> downloaded [if a device targeted build]
     */
    private static pollForBuildComplete(settings: BuildSettings, buildingUrl: string, interval: number, attempts: number, logOffset?: number): Q.Promise<BuildInfo> {
        var thisAttempt = attempts + 1;
        console.info(res.getString("CheckingRemoteBuildStatus", (new Date()).toLocaleTimeString(), buildingUrl, thisAttempt));

        return RemoteBuildClientHelper.httpOptions(buildingUrl, settings).then(RemoteBuildClientHelper.promiseForHttpGet)
            .then(function (responseAndBody: { response: any; body: string }): Q.Promise<BuildInfo> {
            if (responseAndBody.response.statusCode !== 200) {
                throw new Error("Http " + responseAndBody.response.statusCode + ": " + responseAndBody.body);
            }

            var buildInfo = BuildInfo.createNewBuildInfoFromDataObject(JSON.parse(responseAndBody.body));
            console.info(buildInfo.status + " - " + buildInfo.message);
            buildInfo["logOffset"] = logOffset || 0;
            if (buildInfo.status === "complete") {
                return Q(buildInfo);
            } else if (buildInfo.status === "invalid") {
                throw new Error(res.getString("InvalidRemoteBuild", buildInfo.message));
            } else if (buildInfo.status === "error") {
                var err: any = new Error(res.getString("RemoteBuildError", buildInfo.message));
                err.buildInfo = buildInfo;
                throw err;
            }

            return RemoteBuildClientHelper.logBuildOutput(buildInfo, settings).then(function (buildInfo: BuildInfo): Q.Promise<BuildInfo> {
                return Q.delay(interval).then(function (): Q.Promise<BuildInfo> {
                    return RemoteBuildClientHelper.pollForBuildComplete(settings, buildingUrl, interval, thisAttempt, buildInfo["logOffset"]);
                });
            });
        });
    }

    /*
     * Download the finished log of a build, regardless of whether it succeeded or failed
     */
    private static logBuildOutput(buildInfo: BuildInfo, settings: BuildSettings): Q.Promise<BuildInfo> {
        var serverUrl = settings.buildServerUrl;
        var deferred = Q.defer<BuildInfo>();
        var offset: number = buildInfo["logOffset"] || 0;
        var logFlags = offset > 0 ? "r+" : "w";
        var buildNumber = buildInfo.buildNumber;
        var downloadUrl = util.format("%s/build/tasks/%d/log?offset=%d", serverUrl, buildNumber, offset);
        return RemoteBuildClientHelper.httpOptions(downloadUrl, settings).then(request).then(function (req: request.Request): Q.Promise<BuildInfo> {
            var logPath = path.join(settings.platformConfigurationBldDir, "build.log");
            UtilHelper.createDirectoryIfNecessary(settings.platformConfigurationBldDir);
            var logStream = fs.createWriteStream(logPath, { start: offset, flags: logFlags });
            var countStream = new CountStream();
            logStream.on("finish", function (): void {
                console.info(res.getString("BuildLogWrittenTo", logPath));
            });
            req.on("end", function (): void {
                buildInfo["logOffset"] = offset + countStream.count;
                deferred.resolve(buildInfo);
            }).pipe(countStream).pipe(logStream);
            return deferred.promise;
        });
    }

    /*
     * Download the <platform>.json file that tracks the installed plugins on the remote machine.
     * This file is used by vs-mda/vs-tac, but it is also good for checking what plugins are actually installed remotely.
     */
    private static downloadRemotePluginFile(buildInfo: BuildInfo, settings: BuildSettings, toDir: String): Q.Promise<BuildInfo> {
        var serverUrl = settings.buildServerUrl;
        var deferred = Q.defer<BuildInfo>();
        var buildNumber = buildInfo.buildNumber;
        var downloadUrl = util.format("%s/files/%d/cordovaApp/plugins/%s.json", serverUrl, buildNumber, settings.platform);

        var remotePluginStream = fs.createWriteStream(path.join(toDir, util.format("remote_%s.json", settings.platform)));
        remotePluginStream.on("finish", function (): void {
            deferred.resolve(buildInfo);
        });
        return RemoteBuildClientHelper.httpOptions(downloadUrl, settings).then(request).invoke("pipe", remotePluginStream).then(function (): Q.Promise<BuildInfo> {
            return deferred.promise;
        });
    }

    /*
     * Download a completed build from the remote server as a zip
     */
    private static downloadBuild(buildInfo: BuildInfo, settings: BuildSettings, toDir: string): Q.Promise<string> {
        var serverUrl = settings.buildServerUrl;
        UtilHelper.createDirectoryIfNecessary(toDir);
        var deferred = Q.defer<string>();

        var buildNumber = buildInfo.buildNumber;
        var downloadUrl = serverUrl + "/build/" + buildNumber + "/download";

        console.info(res.getString("DownloadingRemoteBuild", downloadUrl, toDir));
        var zipFile = path.join(toDir, buildNumber + ".zip");
        var outZip = fs.createWriteStream(zipFile);
        outZip.on("error", function (error: any): void {
            deferred.reject(new Error(res.getString("ErrorDownloadingRemoteBuild", toDir, error)));
        });
        outZip.on("finish", function (): void {
            console.info(res.getString("DownloadedRemoteBuild", toDir));
            deferred.resolve(zipFile);
        });
        return RemoteBuildClientHelper.httpOptions(downloadUrl, settings).then(request).invoke("pipe", outZip).then(function (): Q.Promise<string> {
            return deferred.promise;
        });
    }

    /*
     * Unzip the downloaded build
     */
    private static unzipBuildFiles(zipFile: string, toDir: string): Q.Promise<{}> {
        console.info(res.getString("ExtractingRemoteBuild", toDir));
        UtilHelper.createDirectoryIfNecessary(toDir);
        var deferred = Q.defer();

        try {
            var zip = new AdmZip(zipFile);
            zip.extractAllTo(toDir, true);
            console.info(res.getString("DoneExtractingRemoteBuild", toDir));
            fs.unlink(zipFile, function (err: NodeJS.ErrnoException): void {
                if (err) {
                    console.info(res.getString("FailedToDeleteRemoteZip", zipFile));
                }

                deferred.resolve({});
            });
        } catch (error) {
            deferred.reject(new Error(res.getString("ErrorDownloadingRemoteBuild", toDir, error)));
        }

        return deferred.promise;
    }

    /*
     * perform a HTTP GET request and return a promise which is resolved with the response or rejected with an error
     */
    private static promiseForHttpGet(urlOptions: request.Options): Q.Promise<{ response: any; body: string }> {
        var deferred = Q.defer<{ response: any; body: string }>();
        request.get(urlOptions, function (error: any, response: any, body: any): void {
            if (error) {
                deferred.reject(new Error(res.getString("ErrorHTTPGet", urlOptions.url, error)));
            } else {
                if (response.statusCode !== 200 && response.statusCode !== 202) {
                    // see if the response is JSON with a message
                    try {
                        var bodyJson = JSON.parse(response.body);
                        if (bodyJson.message) {
                            deferred.reject(new Error(res.getString("HTTPGetFailed", response.statusCode, bodyJson.message)));
                            return;
                        }
                    } catch (e) {
                        // Ignore; the response was not valid JSON
                    }

                    deferred.reject(new Error(res.getString("HTTPGetFailed", response.statusCode, response.body)));
                }

                deferred.resolve({ response: response, body: body });
            }
        });
        return deferred.promise;
    }
}

export = RemoteBuildClientHelper;
