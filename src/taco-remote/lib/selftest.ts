// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/request.d.ts" />
/// <reference path="../../typings/tacoUtils.d.ts" />
/// <reference path="../../typings/cordovaExtensions.d.ts" />
/// <reference path="../../typings/fstream.d.ts" />
/// <reference path="../../typings/tar.d.ts" />

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
        var vcordova: string = "5.4.0"; // Using 5.4.0 for maximum node compatibility
        var tempFolder: string = path.join(os.tmpdir(), "taco-remote", "selftest");
        rimraf.sync(tempFolder);
        utils.createDirectoryIfNecessary(tempFolder);
        var cordovaApp: string = path.join(tempFolder, "helloCordova");

        return TacoPackageLoader.lazyRequire<typeof Cordova>("cordova", "cordova@" + vcordova).then(function (cordova: typeof Cordova): Q.Promise<any> {
            // Create a project and add a plugin
            return cordova.raw.create(cordovaApp).then(function (): Q.Promise<any> {
                var originalCwd = process.cwd();
                process.chdir(cordovaApp);
                return cordova.raw.plugin("add", ["cordova-plugin-device"], {}).finally(function (): void {
                    process.chdir(originalCwd);
                });
            });
        }, function (err: Error): any {
            Logger.logError(resources.getString("CordovaAcquisitionFailed", vcordova, err.toString()));
            throw err;
        }).then(function (): Q.Promise<string> {
            // Submit the project to be built
            var vcli: string = require("../package.json").version;
            var cfg: string = "debug";
            var buildOptions: string = deviceBuild ? "--device" : "--emulator";

            var tgzProducingStream: NodeJS.ReadableStream = null;
            // TODO: Remove the casting once we've get some complete/up-to-date .d.ts files. See https://github.com/Microsoft/TACO/issues/18
            var cordovaAppDirReader: fstream.Reader = new fstream.Reader(<fstream.IReaderProps> { path: cordovaApp, type: "Directory", filter: SelfTest.filterForTar });
            tgzProducingStream = cordovaAppDirReader.pipe(tar.Pack()).pipe(zlib.createGzip());

            var submitDeferred: Q.Deferred<string> = Q.defer<string>();

            var buildUrl: string = util.format("%s/%s/build/tasks/?vcordova=%s&vcli=%s&cfg=%s&command=build&options=%s", host, modMountPoint, vcordova, vcli, cfg, buildOptions);
            // TODO: Remove the casting once we've get some complete/up-to-date .d.ts files. See https://github.com/Microsoft/TACO/issues/18
            tgzProducingStream.pipe(request.post(<request.Options> { url: buildUrl, agent: agent }, function (submitError: any, submitResponse: any, submitBody: any): void {
                if (submitError) {
                    submitDeferred.reject(submitError);
                    return;
                }

                var buildingUrl: string = submitResponse.headers["content-location"];
                if (!buildingUrl) {
                    submitDeferred.reject(new Error(submitBody));
                    return;
                }

                submitDeferred.resolve(buildingUrl);
            }));

            tgzProducingStream.on("error", function (err: Error): void {
                submitDeferred.reject(err);
            });

            return submitDeferred.promise;
        }).then(function (buildingUrl: string): Q.Promise<BuildInfo> {
            // Wait for the project to finish building
            var pingInterval: number = 5000;
            var maxPings: number = 10;
            var i: number = 0;
            var buildDeferred = Q.defer<BuildInfo>();
            var ping: NodeJS.Timer = setInterval(function (): void {
                i++;
                Logger.log(util.format("%d...", i));
                // TODO: Remove the casting once we've get some complete/up-to-date .d.ts files. See https://github.com/Microsoft/TACO/issues/18
                request.get(<request.Options> { url: buildingUrl, agent: agent }, function (statusError: any, statusResponse: any, statusBody: any): void {
                    if (statusError) {
                        clearInterval(ping);
                        buildDeferred.reject(statusError);
                    }

                    var build: BuildInfo = JSON.parse(statusBody);
                    if (build["status"] === BuildInfo.ERROR || build["status"] === BuildInfo.DOWNLOADED || build["status"] === BuildInfo.INVALID) {
                        clearInterval(ping);
                        buildDeferred.reject(new Error("Build Failed: " + statusBody));
                    } else if (build["status"] === BuildInfo.COMPLETE) {
                        clearInterval(ping);

                        if (deviceBuild) {
                            var downloadUrl: string = util.format("%s/%s/build/%d/download", host, modMountPoint, build["buildNumber"]);
                            var buildNumber: any = build["buildNumber"];
                            var downloadFile: string = path.join(downloadDir, "build_" + buildNumber + "_download.zip");
                            var writeStream: fs.WriteStream = fs.createWriteStream(downloadFile);
                            writeStream.on("error", function (err: Error): void {
                                buildDeferred.reject(err);
                            });
                            // TODO: Remove the casting once we've get some complete/up-to-date .d.ts files. See https://github.com/Microsoft/TACO/issues/18
                            request(<request.Options> { url: downloadUrl, agent: agent }).pipe(writeStream).on("finish", function (): void {
                                buildDeferred.resolve(build);
                            }).on("error", function (err: Error): void {
                                buildDeferred.reject(err);
                            });
                        } else {
                            buildDeferred.resolve(build);
                        }
                    } else if (i > maxPings) {
                        buildDeferred.reject(new Error(resources.getString("ExceededMaxPings", maxPings)));
                        clearInterval(ping);
                    }
                });
            }, pingInterval);

            return buildDeferred.promise;
        }).then(function (build: BuildInfo): Q.Promise<any> {
            // Check that the project built with the plugin we added
            var downloadUrl: string = util.format("%s/%s/files/%d/cordovaApp/plugins/ios.json", host, modMountPoint, build["buildNumber"]);
            var deferred = Q.defer();
            // TODO: Remove the casting once we've get some complete/up-to-date .d.ts files. See https://github.com/Microsoft/TACO/issues/18
            request(<request.Options> { url: downloadUrl, agent: agent }, function (error: Error, response: any, body: any): void {
                if (error) {
                    deferred.reject(error);
                }

                try {
                    var pluginJson = JSON.parse(body);
                    if (pluginJson["installed_plugins"]["cordova-plugin-device"]) {
                        deferred.resolve({});
                    } else {
                        deferred.reject("Did not find expected plugin in project built remotely");
                    }
                } catch (e) {
                    deferred.reject(e);
                }
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
