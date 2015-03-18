/// <reference path="../../typings/mocha.d.ts" />

import express = require ("express");
import fs = require ("fs");
import fstream = require ("fstream");
import http = require ("http");
import nconf = require ("nconf");
import os = require ("os");
import path = require ("path");
import request = require ("request");
import tar = require ("tar");
import TacoCordova = require ("../lib/server");
import TacoUtils = require ("taco-utils");
import UtilHelper = TacoUtils.UtilHelper;
import zlib = require ("zlib");

var macOnlyIt = os.platform() === "darwin" ? it : it.skip;

describe("taco-cordova", function (): void {
    var server: http.Server;
    var serverMod: TacoRemote.IServerModule;
    var downloadDir = path.join(__dirname, "out", "selftest");
    var modMountPoint = "Test";
    before(function (mocha: MochaDone): void {
        var app = express();
        var serverDir = path.join(__dirname, "out");
        UtilHelper.createDirectoryIfNecessary(serverDir);
        UtilHelper.createDirectoryIfNecessary(downloadDir);
        nconf.defaults({
            serverDir: serverDir,
            port: 3000,
            secure: false
        }).use("memory");
        TacoCordova.create(nconf, modMountPoint, {}).then(function (serverModule: TacoRemote.IServerModule): void {
            serverMod = serverModule;

            app.use("/" + modMountPoint, serverModule.getRouter());

            server = http.createServer(app);
            server.listen(3000, mocha);
        });
    });

    after(function (mocha: MochaDone): void {
        if (serverMod) {
            serverMod.shutdown();
        }
        server.close(mocha);
    });

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

    macOnlyIt("should successfully build the sample project", function (mocha: MochaDone): void {
        // Building can take a while
        this.timeout(30000);
        var server = "http://" + os.hostname() + ":3000";
        var cordovaApp = path.resolve(__dirname, "..", "examples", "cordovaApp", "helloCordova");
        var tping = 5000;
        var maxPings = 10;
        var vcordova = "4.1.2";
        var cfg = "debug";
        var buildOptions = "--emulator";

        var tgzProducingStream: NodeJS.ReadableStream = null;
        var cordovaAppDirReader = new fstream.Reader({ path: cordovaApp, type: "Directory", mode: 777, filter: filterForTar });
        tgzProducingStream = cordovaAppDirReader.pipe(tar.Pack()).pipe(zlib.createGzip());

        var buildUrl = server + "/"+ modMountPoint + "/build/tasks?vcordova=" + vcordova + "&cfg=" + cfg + "&command=build&options=" + buildOptions;
        tgzProducingStream.pipe(request.post(buildUrl, function (error: any, response: any, body: any): void {
            if (error) {
                mocha(error);
            }

            var buildingUrl = response.headers["content-location"];

            var i = 0;
            var ping = setInterval(function (): void {
                i++;
                request.get(buildingUrl, function (error: any, response: any, body: any): void {
                    if (error) {
                        clearInterval(ping);
                        mocha(error);
                    }

                    var build = JSON.parse(body);
                    if (build["status"] === "error" || build["status"] === "downloaded" || build["status"] === "deleted" || build["status"] === "invalid") {
                        clearInterval(ping);
                        mocha(new Error("Build Failed: " + body));
                    } else if (build["status"] === "complete") {
                        clearInterval(ping);
                        var downloadUrl = server + "/" + modMountPoint + "/build/" + build["buildNumber"] + "/download";
                        var buildNumber = build["buildNumber"];
                        var downloadFile = path.join(downloadDir, "build_" + buildNumber + "_download.zip");
                        request(downloadUrl).pipe(fs.createWriteStream(downloadFile)).on("finish", mocha);
                    } else if (i > maxPings) {
                        mocha(new Error("Exceeded max # of pings: " + maxPings));
                        clearInterval(ping);
                    }
                });
            }, tping);
        }));
    });
});