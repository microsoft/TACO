/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/request.d.ts" />
/// <reference path="../../typings/tacoUtils.d.ts" />
/// <reference path="../../typings/cordovaExtensions.d.ts" />
/// <reference path="../../typings/fstream.d.ts" />

import fs = require ("fs");
import fstream = require ("fstream");
import https = require ("https");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import request = require ("request");
import rimraf = require ("rimraf");
import tar = require ("tar");
import util = require ("util");
import zlib = require ("zlib");

import tacoUtils = require ("taco-utils");
import resources = require ("../resources/resourceManager");

import BuildInfo = tacoUtils.BuildInfo;
import Logger = tacoUtils.Logger;
import TacoPackageLoader = tacoUtils.TacoPackageLoader;
import utils = tacoUtils.UtilHelper;

class SelfTest {
    /**
     * Attempt to submit a build to the specified host running taco-remote on the specifed mount point
     *
     * @param {string} host The protocol, hostname, and port of the server. E.g. "http://localhost:3000"
     * @param {string} modMountPoint The location where taco-remote is mounted. E.g. "cordova"
     * @param {string} downloadDir The folder to save any resulting output to
     * @param {boolean} deviceBuild Whether to build for device, or the emulator.
     * @param {https.Agent} agent An agent to use if making a secure connection.
     *
     * @return a promise which is resolved if the build succeeded, or rejected if the build failed.
     */
    public static test(host: string, modMountPoint: string, downloadDir: string, deviceBuild: boolean, agent: https.Agent): Q.Promise<any> {
        var vcordova = "4.3.0";
        var tempFolder = path.join(os.tmpdir(), "taco-remote", "selftest");
        rimraf.sync(tempFolder);
        utils.createDirectoryIfNecessary(tempFolder);
        var cordovaApp = path.join(tempFolder, "helloCordova");

        return TacoPackageLoader.lazyRequire<typeof Cordova>("cordova", "cordova@" + vcordova).then(function (cordova: typeof Cordova): Q.Promise<any> {
            return cordova.raw.create(cordovaApp);
        }, function (err: Error): any {
                Logger.logError(resources.getString("CordovaAcquisitionFailed", vcordova, err.toString()));
                throw err;
            }).then(function (): Q.Promise<any> {
            var pingInterval: number = 5000;
            var maxPings = 10;
            var vcli = require("../package.json").version;
            var cfg = "debug";
            var buildOptions = deviceBuild ? "--device" : "--emulator";

            var tgzProducingStream: NodeJS.ReadableStream = null;
            // TODO: Remove the casting once we've get some complete/up-to-date .d.ts files. See https://github.com/Microsoft/TACO/issues/18
            var cordovaAppDirReader = new fstream.Reader(<fstream.IReaderProps> { path: cordovaApp, type: "Directory", filter: SelfTest.filterForTar });
            tgzProducingStream = cordovaAppDirReader.pipe(tar.Pack()).pipe(zlib.createGzip());

            var deferred = Q.defer();

            var buildUrl = util.format("%s/%s/build/tasks/?vcordova=%s&vcli=%s&cfg=%s&command=build&options=%s", host, modMountPoint, vcordova, vcli, cfg, buildOptions);
            // TODO: Remove the casting once we've get some complete/up-to-date .d.ts files. See https://github.com/Microsoft/TACO/issues/18
            tgzProducingStream.pipe(request.post(<request.Options> { url: buildUrl, agent: agent }, function (submitError: any, submitResponse: any, submitBody: any): void {
                if (submitError) {
                    deferred.reject(submitError);
                    return;
                }

                var buildingUrl = submitResponse.headers["content-location"];
                if (!buildingUrl) {
                    deferred.reject(new Error(submitBody));
                    return;
                }

                var i = 0;
                var ping = setInterval(function (): void {
                    i++;
                    Logger.log(util.format("%d...", i));
                    // TODO: Remove the casting once we've get some complete/up-to-date .d.ts files. See https://github.com/Microsoft/TACO/issues/18
                    request.get(<request.Options> { url: buildingUrl, agent: agent }, function (statusError: any, statusResponse: any, statusBody: any): void {
                        if (statusError) {
                            clearInterval(ping);
                            deferred.reject(statusError);
                        }

                        var build = JSON.parse(statusBody);
                        if (build["status"] === BuildInfo.ERROR || build["status"] === BuildInfo.DOWNLOADED || build["status"] === BuildInfo.INVALID) {
                            clearInterval(ping);
                            deferred.reject(new Error("Build Failed: " + statusBody));
                        } else if (build["status"] === BuildInfo.COMPLETE) {
                            clearInterval(ping);

                            if (deviceBuild) {
                                var downloadUrl = util.format("%s/%s/build/%d/download", host, modMountPoint, build["buildNumber"]);
                                var buildNumber = build["buildNumber"];
                                var downloadFile = path.join(downloadDir, "build_" + buildNumber + "_download.zip");
                                var writeStream = fs.createWriteStream(downloadFile);
                                writeStream.on("error", function (err: Error): void {
                                    deferred.reject(err);
                                });
                                // TODO: Remove the casting once we've get some complete/up-to-date .d.ts files. See https://github.com/Microsoft/TACO/issues/18
                                request(<request.Options> { url: downloadUrl, agent: agent }).pipe(writeStream).on("finish", function (): void {
                                    deferred.resolve({});
                                }).on("error", function (err: Error): void {
                                    deferred.reject(err);
                                });
                            } else {
                                deferred.resolve({});
                            }
                        } else if (i > maxPings) {
                            deferred.reject(new Error(resources.getString("ExceededMaxPings", maxPings)));
                            clearInterval(ping);
                        }
                    });
                }, pingInterval);
            }));

            tgzProducingStream.on("error", function (err: Error): void {
                deferred.reject(err);
            });

            return deferred.promise;
        });
    }

    // Archive up what is needed for an ios build and put current process user id on entries
    private static filterForTar(reader: fstream.Reader, props: { uid: number }): boolean {
        if (reader.parent) {
            if (reader.parent.basename.match(/^platforms$/)) {
                return false;
            }
        }

        if (process.platform !== "win32") {
            props.uid = process.getuid();
        }

        return true;
    }
}

export = SelfTest;
