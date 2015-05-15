/// <reference path="../../typings/hashFiles.d.ts" />
/// <reference path="../../typings/request.d.ts" />

"use strict";

import fs = require ("fs");
import hashFiles = require ("hash-files");
import Q = require ("q");
import request = require ("request");

import resources = require ("../resources/resourceManager");

class InstallerUtils {
    /*
     * Verifies if the specified file is valid by comparing its sha1 signature and its size in bytes with the provided expectedSha1 and expectedBytes.
     */
    public static isInstallerFileClean(filePath: string, expectedSha1: string, expectedBytes: number): boolean {
        if (expectedSha1 && expectedSha1 !== InstallerUtils.calculateFileSha1(filePath)) {
            return false;
        }

        if (expectedBytes && expectedBytes !== InstallerUtils.getFileBytes(filePath)) {
            return false;
        }

        return true;
    }

    /*
     * Uses the request.Options object provided to download a file from a url and save it to filepath. Verifies that the downloaded file is valid using expectedSha1 and expectedBytes.
     * If the download fails, it will try again up to a maximum of maxDownloadAttempts (defaults to 1).
     */
    public static downloadFile(requestOptions: request.Options, filePath: string, expectedSha1: string, expectedBytes: number, maxDownloadAttempts: number = 1): Q.Promise<any> {
        // Build the promise chain for multiple attempts at downloading
        var q = InstallerUtils.downloadFileInternal(requestOptions, filePath, expectedSha1, expectedBytes);

        for (var i: number = 1; i < maxDownloadAttempts; i++) {
            q = q.then(function (): void {
                // If the download succeeded, do nothing
            }, function (): Q.Promise<any> {
                // If the download fails, try again
                return InstallerUtils.downloadFileInternal(requestOptions, filePath, expectedSha1, expectedBytes);
            });
        }

        return q;
    }

    /*
     * Returns a string where the %...% notations in the provided paths have been replaced with their actual values. For exemple, calling this with "%programfiles%\foo"
     * would return "C:\Program Files\foo" (on most systems).
     */
    public static expandPath(path: string): string {
        return path.replace(/\%(.+?)\%/g, function (substring: string, ...args: any[]): string {
            return process.env[args[0]];
        });
    }

    private static calculateFileSha1(filePath: string): string {
        var options: hashFiles.IOptions = {
            files: [filePath],
            noGlob: true,
            algorithm: "sha1"
        };

        return hashFiles.sync(options);
    }

    private static getFileBytes(filePath: string): number {
        return fs.statSync(filePath).size;
    }

    private static downloadFileInternal(requestOptions: request.Options, filePath: string, expectedSha1: string, expectedBytes: number): Q.Promise<any> {
        var deferred: Q.Deferred<any> = Q.defer<any>();

        request(requestOptions)
            .on("error", function (err: Error) {
                deferred.reject(err);
            })
            .on("response", function (res: fs.ReadStream) {
                var fws = fs.createWriteStream(filePath);

                res.pipe(fws);
                fws.on("finish", function () {
                    // Verify if the file is clean
                    if (InstallerUtils.isInstallerFileClean(filePath, expectedSha1, expectedBytes)) {
                        deferred.resolve({});
                    } else {
                        deferred.reject(new Error(resources.getString("FileCorruptError")));
                    }
                })
            });

        return deferred.promise;
    }
}

export = InstallerUtils;