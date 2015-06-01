/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../typings/rimraf.d.ts" />
/// <reference path="../typings/semver.d.ts" />
/// <reference path="../typings/dynamicDependencyEntry.d.ts" />

"use strict";

import assert = require ("assert");
import child_process = require ("child_process");
import fs = require ("fs");
import mkdirp = require ("mkdirp");
import path = require ("path");
import rimraf = require ("rimraf");
import semver = require ("semver");
import Q = require ("q");

import resources = require ("./resources/resourceManager");
import tacoErrorCodes = require ("./tacoErrorCodes");
import errorHelper = require ("./tacoErrorHelper");
import tacoError = require ("./tacoError");
import UtilHelper = require ("./utilHelper");

import TacoError = tacoError.TacoError;
import TacoErrorCodes = tacoErrorCodes.TacoErrorCode;
import utils = UtilHelper.UtilHelper;

module TacoUtility {
    export enum PackageSpecType {
        Error = -1,
        Registry = 0,
        Uri = 1,
        FilePath = 2
    }

    interface IPackageInstallRequest {
        /**
         * name of the package specified in package.json
         */
        packageName: string;

        /**
         * id given to npm command, say npm install foo@0.1 or npm install https://github.com/apache/cordova-cli
         */
        packageId: string;

        /**
         * type of package src, url, localpath or npm repository
         */
        type: PackageSpecType;

        /**
         * targetPath where we expect installed package.json 
         */
        targetPath: string;

        /**
         * any command flags needed for npm install/update
         */
        commandFlags: string[];

        /**
         * expiration interval in hours. 
         * if expirationIntervalInHours>0, package is checked for updates
         */
        expirationIntervalInHours: number;

        /**
         * log verbosity requested for the operation
         */
        logLevel: string;
    };

    export class TacoPackageLoader {
        private static GitUriRegex: RegExp = /^http(s?)\\:\/\/.*|.*\.git$/;
        private static FileUriRegex: RegExp = /^file:\/\/.*/;

        /**
         * Load a node package with specified version. If the package is not already downloaded,
         * then first download the package and cache it locally for future loads. The loaded package is cast to type T
         *
         * This method is resilient against interrupted downloads, but is not safe under concurrency.
         * Until that changes, we should not allow multiple builds at once.
         *
         * @param {string} packageName The name of the package to load
         * @param {string} packageVersion The version of the package to load. Either a version number such that "npm install package@version" works, or a git url to clone
         * @param {string} logLevel Optional parameter which determines how much output from npm and git is filtered out. Follows the npm syntax: silent, warn, info, verbose, silly
         *
         * @returns {Q.Promise<T>} A promise which is either rejected with a failure to install, or resolved with the require()'d package
         */
        public static lazyRequire<T>(packageName: string, packageId: string, logLevel?: string): Q.Promise<T> {
            return TacoPackageLoader.lazyRequireInternal<T>(TacoPackageLoader.createPackageInstallRequest(packageName, packageId, logLevel));
        }

        /**
         * Load a taco package with specified packageKey. 
         * For development scenario, dependencyConfigPath maps a packageKey to a local folder on disk
         * For production scenario, dependencyConfigPath maps a packageKey to packageName@packageVersion or git url
         *
         * @param {string} packageKey a key to lookup in dependencyConfigPath, can be a packageName or any random string
         * @param {string} dependencyConfigPath Path to a json file which specifies key to packageId information along with other metadata like expirationIntervalInHours
         * @param {string} logLevel Optional parameter which determines how much output from npm and git is filtered out. Follows the npm syntax: silent, warn, info, verbose, silly
         *
         * @returns {Q.Promise<T>} A promise which is either rejected with a failure to install, or resolved with the require()'d package
         */
        public static lazyTacoRequire<T>(packageKey: string, dependencyConfigPath: string, logLevel?: string): Q.Promise<T> {
            var request: IPackageInstallRequest = TacoPackageLoader.createTacoPackageInstallRequest(packageKey, dependencyConfigPath, logLevel);
            assert.notEqual(request, null, "Invalid Package request");

            if (!request.expirationIntervalInHours || request.expirationIntervalInHours <= 0) {
                return TacoPackageLoader.lazyRequireInternal<T>(request);
            }

            return TacoPackageLoader.lazyRequireExpirable<T>(request);
        }

        private static lazyRequireExpirable<T>(request: IPackageInstallRequest): Q.Promise<T> {
            var requireCachePaths: string[] = Object.keys(require.cache);
            return TacoPackageLoader.lazyRequireLatest<T>(request)
                .finally(function (): void {
                // un-cache any files that were just required.
                Object.keys(require.cache).forEach(function (key: string): void {
                    if (requireCachePaths.indexOf(key) === -1) {
                        delete require.cache[key];
                    }
                });
            });
        }

        private static lazyRequireLatest<T>(request: IPackageInstallRequest): Q.Promise<T> {
            assert.notEqual(request.type, PackageSpecType.Uri, "update is not supported for git URIs");

            var updateTimestamp: boolean = false;
            var packageObj: T = null;

            // Check if update is needed
            return TacoPackageLoader.getLastCheckTimestamp(request.targetPath)
                .then(function (lastCheckTimestamp: number): Q.Promise<T> {
                    // Note that needsUpdate is false if package is not present
                    var updateNeeded: boolean = (lastCheckTimestamp > 0) && (Date.now() - lastCheckTimestamp) > request.expirationIntervalInHours * 60 * 60 * 1000;
                    updateTimestamp = updateNeeded || lastCheckTimestamp <= 0;
                    return TacoPackageLoader.lazyRequireInternal<T>(request, updateNeeded);
                })
                .then(function (obj: T): void {
                    packageObj = obj;
                })
                // update last check timestamp 
                .then(function (): Q.Promise<void> {
                    if (updateTimestamp) {
                        return TacoPackageLoader.updateLastCheckTimestamp(request.targetPath);
                    }

                    return Q.resolve<void>(null);
                })
                .then(function (): Q.Promise<T> {
                    return Q(packageObj);
                });
        }

        private static lazyRequireInternal<T>(request: IPackageInstallRequest, needsUpdate: boolean = false): Q.Promise<T> {
            assert.notEqual(request, null);

            return Q({})
                .then(function (): Q.Promise<void> {
                    if (needsUpdate) {
                        // for test scenarios, where test checks expirationIntervalInHours functionality and provide a local package
                        if (request.type === PackageSpecType.FilePath) {
                            return TacoPackageLoader.installPackageViaNPM(request);
                        }

                        return TacoPackageLoader.updatePackageViaNPM(request.packageName, request.targetPath, request.logLevel);
                    }

                    return TacoPackageLoader.installPackageIfNeeded(request);
                })
                .then(function (): T {
                    return TacoPackageLoader.requirePackage<T>(request.targetPath);
                });
        }

        private static createPackageInstallRequest(packageName: string, packageId: string, logLevel: string, expirationIntervalInHours?: number): IPackageInstallRequest {
            var packageType: PackageSpecType = PackageSpecType.Error;

            // The packageId can either be a GIT url, a local file path or name@version (cordova@4.3)
            if ((TacoPackageLoader.GitUriRegex.test(packageId))) {
                packageType = PackageSpecType.Uri;
            } else if (TacoPackageLoader.FileUriRegex.test(packageId)) {
                packageId = packageId.substring("file://".length);
                if (fs.existsSync(packageId)) {
                    packageType = PackageSpecType.FilePath;
                }
            } else {
                // moving this down after Uri/FilePath because both can have '@'. Parse the packageId to retrieve packageVersion
                var packageVersion: string = packageId.split("@")[1];
                if (!packageVersion || semver.valid(packageVersion)) {
                    packageType = PackageSpecType.Registry;
                }
            }

            var homePackageModulesPath = path.join(utils.tacoHome, "node_modules", packageName);
            switch (packageType) {
                case PackageSpecType.Registry:
                    var versionSubFolder: string = packageId.split("@")[1] || "latest";
                    return <IPackageInstallRequest>{
                        packageName: packageName,
                        type: packageType,
                        packageId: packageId,
                        targetPath: path.join(homePackageModulesPath, versionSubFolder, "node_modules", packageName),
                        expirationIntervalInHours: expirationIntervalInHours
                    };

                case PackageSpecType.Uri:
                case PackageSpecType.FilePath:
                    return <IPackageInstallRequest>{
                        packageName: packageName,
                        type: packageType,
                        packageId: packageId,
                        targetPath: path.join(homePackageModulesPath, encodeURIComponent(packageId), "node_modules", packageName),
                        commandFlags: ["--production"],
                        expirationIntervalInHours: expirationIntervalInHours
                    };
                    break;

                case PackageSpecType.Error:
                    throw errorHelper.get(TacoErrorCodes.PackageLoaderInvalidPackageVersionSpecifier, packageId.split("@")[1], packageName);
            }
        }

        private static createTacoPackageInstallRequest(packageKey: string, dependencyConfigPath: string, logLevel?: string): IPackageInstallRequest {
            if (fs.existsSync(dependencyConfigPath)) {
                try {
                    var dependencyLookup: any = require(dependencyConfigPath);
                    var packageEntry: IDynamicDependencyEntry = dependencyLookup[packageKey];
                    if (packageEntry) {
                        // if a local path is specified use that otherwise fallback to packageName@packageVersion
                        var packageId: string = packageEntry.localPath || packageEntry.packageId;
                        return TacoPackageLoader.createPackageInstallRequest(packageEntry.packageName, packageId, logLevel, packageEntry.expirationIntervalInHours);
                    }
                } catch (exception) {
                    assert.fail(exception, null, "dynamic dependencies file " + dependencyConfigPath + " is missing or corrupted");
                }
            }

            return null;
        }

        private static runNpmCommand(npmCommand: string, packageId: string, cwd: string, flags: string[], logLevel?: string): Q.Promise<number> {
            var deferred: Q.Deferred<number> = Q.defer<number>();
            var args: string[] = [npmCommand, packageId];

            if (logLevel) {
                args.push("--loglevel", logLevel);
            }

            if (flags) {
                args = args.concat(flags);
            }

            var npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
            var npmProcess = child_process.spawn(npmCommand, args, { cwd: cwd, stdio: "inherit" });
            npmProcess.on("error", function (error: Error): void {
                deferred.reject(error);
            });
            npmProcess.on("exit", function (exitCode: number): void {
                if (exitCode === 0) {
                    deferred.resolve(0);
                } else {
                    deferred.reject(exitCode);
                }
            });

            return deferred.promise;
        }

        private static installPackageViaNPM(request: IPackageInstallRequest): Q.Promise<void> {
            return Q.denodeify(mkdirp)(request.targetPath).then(function (): Q.Promise<any> {
                var cwd: string = path.resolve(request.targetPath, "..", "..");
                return TacoPackageLoader.runNpmCommand("install", request.packageId, cwd, request.commandFlags, request.logLevel).catch(function (err: any): void {
                    rimraf(request.targetPath, function (): Q.Promise<void> {
                        if (isFinite(err)) {
                            // error code reported when npm fails due to EACCES
                            if (err === 243) {
                                return Q.reject<void>(errorHelper.get(TacoErrorCodes.PackageLoaderNpmInstallFailedEaccess, request.packageName, err));
                            }

                            return Q.reject<void>(errorHelper.get(TacoErrorCodes.PackageLoaderNpmInstallFailedWithCode, request.packageName, err));
                        }

                        return Q.reject<void>(errorHelper.wrap(TacoErrorCodes.PackageLoaderNpmInstallErrorMessage, err, request.packageName));
                    });
                });
            });
        }

        private static updatePackageViaNPM(packageName: string, targetPath: string, logLevel?: string): Q.Promise<void> {
            var cwd: string = path.resolve(targetPath, "..", "..");
            return TacoPackageLoader.runNpmCommand("update", packageName, cwd, null /* commandFlags */, logLevel).catch(function (err: any): void {
                if (isFinite(err)) {
                    // error code reported when npm fails due to EACCES
                    if (err === 243) {
                        throw errorHelper.get(TacoErrorCodes.PackageLoaderNpmUpdateFailedEaccess, packageName, err);
                    }

                    throw errorHelper.get(TacoErrorCodes.PackageLoaderNpmUpdateFailedWithCode, packageName, err);
                }

                throw errorHelper.wrap(TacoErrorCodes.PackageLoaderNpmUpdateErrorMessage, err, packageName);
            });
        }

        private static installPackageIfNeeded(request: IPackageInstallRequest): Q.Promise<void> {
            return Q({}).then(function (): Q.Promise<void> {
                if (!TacoPackageLoader.packageNeedsInstall(request.targetPath)) {
                    return Q.resolve<void>(null);
                }

                // Delete the target path if it already exists and create an empty folder
                if (fs.existsSync(request.targetPath)) {
                    rimraf.sync(request.targetPath);
                }

                mkdirp.sync(request.targetPath);
                // Create a file 
                fs.closeSync(fs.openSync(TacoPackageLoader.getStatusFilePath(request.targetPath), "w"));

                return TacoPackageLoader.installPackageViaNPM(request).then(function (): Q.Promise<void> {
                    return TacoPackageLoader.removeStatusFile(request.targetPath);
                });
            });
        }

        private static requirePackage<T>(packageTargetPath: string): T {
            return <T>require(packageTargetPath);
        }

        private static getStatusFilePath(targetPath: string): string {
            return path.resolve(targetPath, "..", "Installing.tmp");
        }

        private static removeStatusFile(targetPath: string): Q.Promise<any> {
            var statusFilePath = TacoPackageLoader.getStatusFilePath(targetPath);
            return Q.denodeify(fs.unlink)(statusFilePath);
        }

        private static packageNeedsInstall(targetPath: string): boolean {
            var statusFilePath = TacoPackageLoader.getStatusFilePath(targetPath);
            // if package.json doesn't exist or status file is still lingering around
            // it is an invalid installation
            return !fs.existsSync(path.join(targetPath, "package.json")) || fs.existsSync(statusFilePath);
        }

        private static getTimestampFilePath(targetPath: string): string {
            return path.resolve(targetPath, "..", "..", "timestamp.txt");
        }

        private static getLastCheckTimestamp(targetPath: string): Q.Promise<number> {
            return Q.denodeify(fs.readFile)(TacoPackageLoader.getTimestampFilePath(targetPath))
                .then(function (data: Buffer): number {
                    return parseInt(data.toString());
                })
                .catch(function (error: any): number {
                    return -1;
                });
        }

        private static updateLastCheckTimestamp(targetPath: string): Q.Promise<void> {
            return Q.denodeify(fs.writeFile)(TacoPackageLoader.getTimestampFilePath(targetPath), Date.now().toString())
                .catch(function (): any {
                    return Q.resolve<void>(null);
            });
        }
    }
}

export = TacoUtility;
