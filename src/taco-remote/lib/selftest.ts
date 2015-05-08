/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/tacoUtils.d.ts" />

import fs = require ("fs");
import fstream = require ("fstream");
import https = require ("https");
import path = require ("path");
import Q = require ("q");
import request = require ("request");
import tar = require ("tar");
import util = require ("util");
import zlib = require ("zlib");

import tacoUtils = require("taco-utils");

import BuildInfo = tacoUtils.BuildInfo;

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
        var cordovaApp = path.resolve(__dirname, "..", "examples", "cordovaApp", "helloCordova");
        var tping = 5000;
        var maxPings = 10;
        var vcordova = "4.3.0";
        var vcli = require("../package.json").version;
        var cfg = "debug";
        var buildOptions = deviceBuild ? "--device" : "--emulator";

        var tgzProducingStream: NodeJS.ReadableStream = null;
        var cordovaAppDirReader = new fstream.Reader({ path: cordovaApp, type: "Directory", filter: SelfTest.filterForTar });
        tgzProducingStream = cordovaAppDirReader.pipe(tar.Pack()).pipe(zlib.createGzip());

        var deferred = Q.defer();

        var buildUrl = util.format("%s/%s/build/tasks/?vcordova=%s&vcli=%s&cfg=%s&command=build&options=%s", host, modMountPoint, vcordova, vcli, cfg, buildOptions);
        tgzProducingStream.pipe(request.post({ url: buildUrl, agent: agent }, function (error: any, response: any, body: any): void {
            if (error) {
                deferred.reject(error);
                return;
            }

            var buildingUrl = response.headers["content-location"];
            if (!buildingUrl) {
                deferred.reject(new Error(body));
                return;
            }

            var i = 0;
            var ping = setInterval(function (): void {
                i++;
                console.log(util.format("%d...", i));
                request.get({ url: buildingUrl, agent: agent }, function (error: any, response: any, body: any): void {
                    if (error) {
                        clearInterval(ping);
                        deferred.reject(error);
                    }

                    var build = JSON.parse(body);
                    if (build["status"] === BuildInfo.ERROR || build["status"] === BuildInfo.DOWNLOADED || build["status"] === BuildInfo.INVALID) {
                        clearInterval(ping);
                        deferred.reject(new Error("Build Failed: " + body));
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
                            request({ url: downloadUrl, agent: agent }).pipe(writeStream).on("finish", function (): void {
                                deferred.resolve({});
                            }).on("error", function (err: Error): void {
                                deferred.reject(err);
                            });
                        } else {
                            deferred.resolve({});
                        }
                    } else if (i > maxPings) {
                        deferred.reject(new Error("Exceeded max # of pings: " + maxPings));
                        clearInterval(ping);
                    }
                });
            }, tping);
        }));

        tgzProducingStream.on("error", function (err: Error): void {
            deferred.reject(err);
        });

        return deferred.promise;
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