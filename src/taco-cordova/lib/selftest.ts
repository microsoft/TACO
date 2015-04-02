
import fs = require ("fs");
import fstream = require ("fstream");
import path = require ("path");
import Q = require ("q");
import request = require ("request");
import tar = require ("tar");
import util = require ("util");
import zlib = require ("zlib");

module SelfTest {
    export function test(host: string, modMountPoint: string, downloadDir: string): Q.Promise<any> {
        var cordovaApp = path.resolve(__dirname, "..", "examples", "cordovaApp", "helloCordova");
        var tping = 5000;
        var maxPings = 10;
        var vcordova = "4.3.0";
        var vcli = require("../package.json").version;
        var cfg = "debug";
        var buildOptions = "--emulator";

        var tgzProducingStream: NodeJS.ReadableStream = null;
        var cordovaAppDirReader = new fstream.Reader({ path: cordovaApp, type: "Directory", mode: 777, filter: filterForTar });
        tgzProducingStream = cordovaAppDirReader.pipe(tar.Pack()).pipe(zlib.createGzip());

        var deferred = Q.defer();

        var buildUrl = util.format("%s/%s/build/tasks/?vcordova=%s&vcli=%s&cfg=%s&command=build&options=%s", host, modMountPoint, vcordova, vcli, cfg, buildOptions);
        tgzProducingStream.pipe(request.post(buildUrl, function (error: any, response: any, body: any): void {
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
                request.get(buildingUrl, function (error: any, response: any, body: any): void {
                    if (error) {
                        clearInterval(ping);
                        deferred.reject(error);
                    }

                    var build = JSON.parse(body);
                    if (build["status"] === "error" || build["status"] === "downloaded" || build["status"] === "deleted" || build["status"] === "invalid") {
                        clearInterval(ping);
                        deferred.reject(new Error("Build Failed: " + body));
                    } else if (build["status"] === "complete") {
                        clearInterval(ping);
                        var downloadUrl = util.format("%s/%s/build/%d/download", host, modMountPoint, build["buildNumber"]);
                        var buildNumber = build["buildNumber"];
                        var downloadFile = path.join(downloadDir, "build_" + buildNumber + "_download.zip");
                        var writeStream = fs.createWriteStream(downloadFile);
                        writeStream.on("error", function (err: Error): void {
                            deferred.reject(err);
                        });
                        request(downloadUrl).pipe(writeStream).on("finish", function (): void {
                            deferred.resolve({});
                        }).on("error", function (err: Error): void {
                            deferred.reject(err);
                        });
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
}

export = SelfTest;