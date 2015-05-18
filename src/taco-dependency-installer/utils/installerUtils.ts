/// <reference path="../../typings/hashFiles.d.ts" />
/// <reference path="../../typings/request.d.ts" />

"use strict";

import fs = require ("fs");
import hashFiles = require ("hash-files");
import Q = require ("q");
import request = require ("request");

import resources = require ("../resources/resourceManager");

module InstallerUtils {
    export interface IExpectedProperties {
        sha1?: string;
        bytes?: number;
    }
}

class InstallerUtils {
    /*
     * Verifies if the specified file is valid by comparing its sha1 signature and its size in bytes with the provided expectedSha1 and expectedBytes.
     */
    public static isInstallerFileClean(filePath: string, expectedProperties: InstallerUtils.IExpectedProperties): boolean {
        if (!expectedProperties) {
            return true;
        }

        if (expectedProperties.sha1 && expectedProperties.sha1 !== InstallerUtils.calculateFileSha1(filePath)) {
            return false;
        }

        if (expectedProperties.bytes && expectedProperties.bytes !== InstallerUtils.getFileBytes(filePath)) {
            return false;
        }

        return true;
    }

    /*
     * Uses the request.Options object provided to download a file from a url and save it to filepath. Verifies that the downloaded file is valid using expectedSha1 and expectedBytes.
     * If the download fails, it will try again up to a maximum of maxDownloadAttempts (defaults to 1).
     */
    public static downloadFile(requestOptions: request.Options, filePath: string, expectedProperties: InstallerUtils.IExpectedProperties, maxDownloadAttempts: number = 1): Q.Promise<any> {
        // Build the promise chain for multiple attempts at downloading
        var promise: Q.Promise<any> = InstallerUtils.downloadFileInternal(requestOptions, filePath, expectedProperties);

        for (var i: number = 1; i < maxDownloadAttempts; i++) {
            promise = promise
                .then(function (): void {
                    // If the download succeeded, do nothing
                }, function (): Q.Promise<any> {
                    // If the download fails, try again.
                    // Note: there may be some specific error cases where we know retrying to download won't fix the issue. If we ever come across such a case, detect it here and don't retry
                    return InstallerUtils.downloadFileInternal(requestOptions, filePath, expectedProperties);
                });
        }

        return promise;
    }

    /*
     * Returns a string where the %...% notations in the provided path have been replaced with their actual values. For example, calling this with "%programfiles%\foo"
     * would return "C:\Program Files\foo" (on most systems).
     */
    public static expandPath(path: string): string {
        return path.replace(/\%(.+?)\%/g, function (substring: string, ...args: any[]): string {
            if (process.env[args[0]]) {
                return process.env[args[0]];
            } else {
                // This is not an environment variable, can't replace it
                return args[0];
            }
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

    private static downloadFileInternal(requestOptions: request.Options, filePath: string, expectedProperties: InstallerUtils.IExpectedProperties): Q.Promise<any> {
        var deferred: Q.Deferred<any> = Q.defer<any>();

        request(requestOptions)
            .on("error", function (err: Error): void {
                deferred.reject(err);
            })
            .on("response", function (response: any): void {
                if (response.statusCode < 200 || response.statusCode >= 300) {
                    // Even though 1xx and 3xx codes aren't error codes, it still means that the specified URL does not point to a downloadable file, so error out
                    deferred.reject(new Error(resources.getString("FileNotFound")));
                }

                var fws = fs.createWriteStream(filePath);

                response.pipe(fws);
                fws.on("finish", function (): void {
                    // Verify if the file is clean
                    if (InstallerUtils.isInstallerFileClean(filePath, expectedProperties)) {
                        deferred.resolve({});
                    } else {
                        deferred.reject(new Error(resources.getString("FileCorruptError")));
                    }
                });
                fws.on("error", function (err: Error): void {
                    deferred.reject(err);
                });
            });

        return deferred.promise;
    }
}

export = InstallerUtils;