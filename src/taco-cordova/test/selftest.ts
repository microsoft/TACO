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
/// <reference path="../../typings/fstream.d.ts" />
/// <reference path="../../typings/request.d.ts" />
/// <reference path="../../typings/tar.d.ts" />
"use strict";

import fs = require ("fs");
import fstream = require ("fstream");
import https = require ("https");
import nconf = require ("nconf");
import os = require ("os");
import path = require ("path");
import request = require ("request");
import Q = require ("q");
import tar = require ("tar");
import utils = require ("taco-utils");
import UtilHelper = utils.UtilHelper;
import zlib = require ("zlib");

import HostSpecifics = require ("../lib/host-specifics");

import TacoCordova = require("../lib/server");

function selfTest(): void {
    nconf.argv();
    nconf.defaults({
        server: "http://" + os.hostname() + ":3000",
        serverDir: HostSpecifics.hostSpecifics.defaults({})["serverDir"],
        wait: true,
        download: false,
        cordovaApp: path.resolve(__dirname, "..", "examples", "cordovaApp", "helloCordova"),
        tping: 5000,
        maxping: 10,
        vcordova: "4.1.2",
        cfg: "release",
        suppressVisualStudioMessage: true
    });

    var serverUrl = nconf.get("server");
    var serverDir = path.resolve(process.cwd(), nconf.get("serverDir"));

    initialize(serverUrl, serverDir).then(runTest);
}

var selftestDownloadDir: string;
var httpsAgent: https.Agent;

function runTest(): void {
    var serverUrl: string = nconf.get("server");
    var tgzFile: string = nconf.get("tgz");
    var cordovaAppDir: string = nconf.get("cordovaApp");
    var wait: boolean = nconf.get("wait");
    var download: boolean = nconf.get("download");
    var pingInterval: number = nconf.get("tping");
    var maxPings: number = nconf.get("maxping");
    var vcordova: string = nconf.get("vcordova");
    var cfg: string = nconf.get("cfg");
    var buildOptions: string = nconf.get("device") ? "--device" : "--emulator";

    var tgzProducingStream: NodeJS.ReadableStream = null;
    if (tgzFile) {
        tgzProducingStream = fs.createReadStream(tgzFile);
    } else if (cordovaAppDir) {
        var cordovaAppDirReader = new fstream.Reader({ path: cordovaAppDir, type: "Directory", mode: 777, filter: filterForTar });
        tgzProducingStream = cordovaAppDirReader.pipe(tar.Pack()).pipe(zlib.createGzip());
    }

    var buildUrl = serverUrl + "/build/tasks?vcordova=" + vcordova + "&cfg=" + cfg + "&command=build&options=" + buildOptions;
    console.info("serverUrl: " + serverUrl);
    console.info("buildUrl: " + buildUrl);
    tgzProducingStream.pipe(request.post(requestOptions(buildUrl), function (error: any, response: any, body: any): void {
        console.info("Response statusCode: " + response.statusCode);
        console.info(response.headers);
        console.info("Response: " + body);

        if (wait || download) {
            var i = 0;
            var buildingUrl = response.headers["content-location"];
            console.info("buildingUrl: " + buildUrl);

            var ping = setInterval(function (): void {
                i++;
                request.get(requestOptions(buildingUrl), function (error: any, response: any, body: any): void {
                    if (error) {
                        console.info("[" + i + "] Response: " + response.url + " " + error);
                        clearInterval(ping);
                        return;
                    }

                    console.info("[" + i + "] Response: " + response.url + " " + body);
                    var build = JSON.parse(body);
                    if (build["status"] === "error" || build["status"] === "downloaded" || build["status"] === "deleted" || build["status"] === "invalid") {
                        clearInterval(ping);
                    } else if (build["status"] === "complete") {
                        console.info("Build completed on server");
                        if (download) {
                            var downloadUrl = serverUrl + "/build/" + build["buildNumber"] + "/download";
                            var buildNumber = build["buildNumber"];
                            var downloadFile = path.join(selftestDownloadDir, "build_" + buildNumber + "_download.zip");
                            console.info("Downloading completed build from " + downloadUrl + " to " + downloadFile + "...");
                            request(requestOptions(downloadUrl)).pipe(fs.createWriteStream(downloadFile));
                            console.info("Downloaded " + downloadFile);
                        }

                        clearInterval(ping);
                    } else if (i > maxPings) {
                        console.info("Exceeded max # of pings: " + maxPings);
                        clearInterval(ping);
                    }
                });
            }, pingInterval);
        }
    }));
}

function initialize(serverUrl: string, serverDir: string): Q.Promise<void> {
    selftestDownloadDir = path.join(serverDir, "selftest");
    UtilHelper.createDirectoryIfNecessary(selftestDownloadDir);

    

    return Q<void>(void 0);
}

function downloadClientCert(serverUrl: string, serverDir: string, pin: number): Q.Promise<string> {
    var deferred = Q.defer<string>();
    var downloadPfxPath = path.join(selftestDownloadDir, "selftest-client.pfx");
    console.info("Downloading client cert for selftest from %s to %s", serverUrl + "/certs/" + pin, downloadPfxPath);
    var req = request.get({ url: serverUrl + "/certs/" + pin, strictSSL: false });
    req.pipe(fs.createWriteStream(downloadPfxPath));
    req.on("end", function (): void {
        deferred.resolve(downloadPfxPath);
    });
    return deferred.promise;
}

// Archive up what is needed for an ios build and put current process user id on entries
function filterForTar(reader: fstream.Reader, props: { uid: number }): boolean {
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

function requestOptions(url: string): { url: string; agent: https.Agent } {
    return { url: url, agent: httpsAgent };
}

export = selfTest;