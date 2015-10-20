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
/// <reference path="../typings/tacoPackageLoader.d.ts" />

"use strict";

import assert = require ("assert");
import child_process = require ("child_process");
import fs = require ("fs");
import mkdirp = require("mkdirp");
import os = require("os");
import path = require ("path");
import rimraf = require ("rimraf");
import semver = require ("semver");
import Q = require ("q");

import installLogLevel = require ("./installLogLevel");
import loggerUtil = require ("./logger");
import logLevel = require ("./logLevel");
import resources = require ("./resources/resourceManager");
import tacoErrorCodes = require ("./tacoErrorCodes");
import errorHelper = require ("./tacoErrorHelper");
import tacoError = require ("./tacoError");
import globalConfig = require ("./tacoGlobalConfig");
import UtilHelper = require ("./utilHelper");

import InstallLogLevel = installLogLevel.InstallLogLevel;
import logger = loggerUtil.Logger;
import LogLevel = logLevel.LogLevel;
import TacoError = tacoError.TacoError;
import TacoErrorCodes = tacoErrorCodes.TacoErrorCode;
import TacoGlobalConfig = globalConfig.TacoGlobalConfig;
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
        logLevel: InstallLogLevel;
    };

    export interface ITacoPackageLoader {
        lazyRequire<T>(packageName: string, packageId: string, logLevel?: InstallLogLevel): Q.Promise<T>;
        lazyRun(packageName: string, packageId: string, commandName: string, logLevel?: InstallLogLevel): Q.Promise<string>;
    }

    export class TacoPackageLoader {
        public static GIT_URI_REGEX: RegExp = /^http(s?)\\:\/\/.*|.*\.git$/;
        public static FILE_URI_REGEX: RegExp = new RegExp("^" + TacoPackageLoader.FILE_REGEX_PREFIX + ".*");

        public static mockForTests: TacoUtility.ITacoPackageLoader;

        private static FILE_REGEX_PREFIX: string = "file://";

        /**
         * Returns a path to the specified command exported from the specified package. If the package is not already downloaded,
         * then first download and cache it locally.
         *
         * @param {string} packageName The name of the package to load
         * @param {string} packageId The version of the package to load. Either a version number such that "npm install package@version" works, or a git url to clone
         * @param {string} commandName The name of the binary to find
         * @param {LogLevel} logLevel Optional parameter which determines how much output from npm is filtered out. 
         *                  Follows the npm syntax: silent, warn, info, verbose, silly
         *                  loglevel can also be used as "pretty" in which case, only formatted taco messages like Downloading cordova@5.0 are shown
         * @returns {Q.Promise<string>} A promise which is either rejected with a failure to find the local the binary or resolved with a path to the binary
         */
        public static lazyRun(packageName: string, packageId: string, commandName: string, logLevel: InstallLogLevel = InstallLogLevel.warn): Q.Promise<string> {
            var request: IPackageInstallRequest = TacoPackageLoader.createPackageInstallRequest(packageName, packageId, logLevel);

            return Q({})
                .then(function (): Q.Promise<void> {
                    return TacoPackageLoader.installPackageIfNeeded(request);
                })
                .then(function (): Q.Promise<string> {
                    var packageJsonFilePath = path.join(request.targetPath, "package.json");
                    var packageJson = JSON.parse(<any> fs.readFileSync(packageJsonFilePath));

                    if (packageJson.bin && packageJson.bin[commandName]) {
                        var commandFilePath = path.join(request.targetPath, "..", ".bin", commandName);
                        if (os.platform() === "win32") {
                            commandFilePath += ".cmd";
                        }
                        if (fs.existsSync(commandFilePath)) {
                            return Q.resolve(commandFilePath);
                        }
                    }

                    return Q.reject<string>(errorHelper.get(TacoErrorCodes.PackageLoaderRunPackageDoesntHaveRequestedBinary, packageName, commandName));
                });
        }

        /**
         * Load a node package with specified version. If the package is not already downloaded,
         * then first download the package and cache it locally for future loads. The loaded package is cast to type T
         *
         * This method is resilient against interrupted downloads, but is not safe under concurrency.
         * Until that changes, we should not allow multiple builds at once.
         *
         * @param {string} packageName The name of the package to load
         * @param {string} packageVersion The version of the package to load. Either a version number such that "npm install package@version" works, or a git url to clone
         * @param {string} logLevel Optional parameter which determines how much output from npm is filtered out. 
         *                  Follows the npm syntax: silent, warn, info, verbose, silly
         *                  loglevel can also be used as "taco" in which case, only formatted taco messages like Downloading cordova@5.0 are shown
         * 
         *
         * @returns {Q.Promise<T>} A promise which is either rejected with a failure to install, or resolved with the require()'d package
         */
        public static lazyRequire<T>(packageName: string, packageId: string, logLevel: InstallLogLevel = InstallLogLevel.warn): Q.Promise<T> {
            if (!this.mockForTests) {
                return TacoPackageLoader.lazyRequireInternal<T>(TacoPackageLoader.createPackageInstallRequest(packageName, packageId, logLevel));
            } else {
                return this.mockForTests.lazyRequire<T>(packageName, packageId, logLevel);
            }
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
        public static lazyTacoRequire<T>(packageKey: string, dependencyConfigPath: string, logLevel: InstallLogLevel = InstallLogLevel.warn): Q.Promise<T> {
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

            // Check if update is needed
            return TacoPackageLoader.getLastCheckTimestamp(request.targetPath)
            .then(function (lastCheckTimestamp: number): Q.Promise<T> {
                if (lastCheckTimestamp < 0) {
                    // No previous version, we must download something
                    return TacoPackageLoader.lazyRequireInternal<T>(request).then(function (obj: T): Q.Promise<T> {
                        TacoPackageLoader.updateLastCheckTimestamp(request.targetPath);
                        return Q<T>(obj);
                    });
                } else {
                    // A previous version exists. If we can't acquire a new one,
                    // we may continue using the previous version
                    var updateRequested: boolean = (Date.now() - lastCheckTimestamp) > request.expirationIntervalInHours * 60 * 60 * 1000;

                    if (updateRequested) {
                        var targetPath: string = request.targetPath;
                        var backupPath: string = request.targetPath + "_backup";
                        try {
                            if (fs.existsSync(backupPath)) {
                                rimraf.sync(backupPath);
                            }

                            fs.renameSync(targetPath, backupPath);
                        } catch (e) {
                            if (TacoGlobalConfig.logLevel === LogLevel.Diagnostic) {
                                logger.logWarning(e.toString());
                            }
                            // log but ignore the error, the user shouldn't have to care if the backup is in an inconsistent state
                        }

                        return TacoPackageLoader.lazyRequireInternal<T>(request).then(function (obj: T): Q.Promise<T> {
                            try {
                                rimraf.sync(backupPath);
                            } catch (e) {
                                if (TacoGlobalConfig.logLevel === LogLevel.Diagnostic) {
                                    logger.logWarning(e.toString());
                                }
                                // log but ignore the error, the user shouldn't have to care if the backup is in an inconsistent state
                            }

                            TacoPackageLoader.updateLastCheckTimestamp(request.targetPath);
                            return Q<T>(obj);
                        }, function (error: any): Q.Promise<T> {
                                try {
                                    logger.logWarning(error.toString());
                                    rimraf.sync(targetPath);
                                    fs.renameSync(backupPath, targetPath);
                                    return TacoPackageLoader.lazyRequireInternal<T>(request);
                                } catch (e) {
                                    // An error happened, either when deleting the attempted new install, or when moving the backup in to place
                                    throw errorHelper.wrap(TacoErrorCodes.PackageLoaderUpdateUnableToRecover, e, targetPath);
                                }
                            });
                    } else {
                        // Just use the cached version, no need to download a new version and update timestamps
                        return TacoPackageLoader.lazyRequireInternal<T>(request);
                    }
                }
            });
        }

        private static lazyRequireInternal<T>(request: IPackageInstallRequest): Q.Promise<T> {
            assert.notEqual(request, null);

            return Q({})
                .then(function (): Q.Promise<void> {
                    return TacoPackageLoader.installPackageIfNeeded(request);
                })
                .then(function (): T {
                    return TacoPackageLoader.requirePackage<T>(request.targetPath);
                });
        }

        private static createPackageInstallRequest(packageName: string, packageId: string, logLevel: InstallLogLevel, expirationIntervalInHours?: number): IPackageInstallRequest {
            var packageType: PackageSpecType = PackageSpecType.Error;

            // The packageId can either be a GIT url, a local file path or name@version (cordova@4.3)
            if ((TacoPackageLoader.GIT_URI_REGEX.test(packageId))) {
                packageType = PackageSpecType.Uri;
            } else if (TacoPackageLoader.FILE_URI_REGEX.test(packageId)) {
                packageId = packageId.substring(TacoPackageLoader.FILE_REGEX_PREFIX.length);
                packageType = PackageSpecType.FilePath;
            } else {
                // moving this down after Uri/FilePath because both can have '@'. Parse the packageId to retrieve packageVersion
                var packageVersion: string = packageId.split("@")[1];
                if (!packageVersion || semver.valid(packageVersion)) {
                    packageType = PackageSpecType.Registry;
                }
            }

            var homePackageModulesPath: string = path.join(utils.tacoHome, "node_modules", packageName);
            switch (packageType) {
                case PackageSpecType.Registry:
                    var versionSubFolder: string = packageId.split("@")[1] || "latest";
                    return <IPackageInstallRequest> {
                        packageName: packageName,
                        type: packageType,
                        packageId: packageId,
                        targetPath: path.join(homePackageModulesPath, versionSubFolder, "node_modules", packageName),
                        expirationIntervalInHours: expirationIntervalInHours,
                        logLevel: logLevel
                    };

                case PackageSpecType.Uri:
                case PackageSpecType.FilePath:
                    return <IPackageInstallRequest> {
                        packageName: packageName,
                        type: packageType,
                        packageId: packageId,
                        targetPath: path.join(homePackageModulesPath, encodeURIComponent(packageId), "node_modules", packageName),
                        commandFlags: ["--production"],
                        expirationIntervalInHours: expirationIntervalInHours,
                        logLevel: logLevel
                    };

                case PackageSpecType.Error:
                    throw errorHelper.get(TacoErrorCodes.PackageLoaderInvalidPackageVersionSpecifier, packageId.split("@")[1], packageName);
            }
        }

        private static createTacoPackageInstallRequest(packageKey: string, dependencyConfigPath: string, logLevel: InstallLogLevel): IPackageInstallRequest {
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

        private static runNpmCommand(npmCommand: string, packageId: string, cwd: string, flags: string[], logLevel?: InstallLogLevel): Q.Promise<number> {
            var deferred: Q.Deferred<number> = Q.defer<number>();
            var args: string[] = [npmCommand, packageId];

            if (typeof logLevel !== "undefined" && logLevel !== InstallLogLevel.taco) {
                args.push("--loglevel", InstallLogLevel[logLevel]);
            }

            if (flags) {
                args = args.concat(flags);
            }
            var npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";

            var stdio: any = logLevel === InstallLogLevel.error // On the default error message level, we don't want to show npm output messages
                ? [/*stdin*/ "ignore", /*stdout*/ "ignore", /*stderr*/ process.stderr] // So we inherit stderr but we ignore stdin and stdout
                : "inherit"; // For silent everything is ignored, so it doesn't matter, for everything else we just let npm inherit all our streams

            var npmProcess = child_process.spawn(npmExecutable, args, { cwd: cwd, stdio: stdio });
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
            if (request.logLevel >= InstallLogLevel.taco) {
                logger.logLine();
                logger.log(resources.getString("PackageLoaderDownloadingMessage", request.packageId));
            }

            return Q.denodeify(mkdirp)(request.targetPath).then(function (): Q.Promise<any> {
                var cwd: string = path.resolve(request.targetPath, "..", "..");
                return TacoPackageLoader.runNpmCommand("install", request.packageId, cwd, request.commandFlags, request.logLevel).then(function (): void {
                    if (request.logLevel >= InstallLogLevel.taco) {
                        logger.logLine();
                        logger.log(resources.getString("PackageLoaderDownloadCompletedMessage", request.packageId));
                    }
                }).catch(function (err: any): Q.Promise<void> {
                    var deferred: Q.Deferred<void> = Q.defer<void>();
                    rimraf(request.targetPath, function (): void {
                        if (request.logLevel >= InstallLogLevel.taco) {
                            logger.logLine();
                            logger.logError(resources.getString("PackageLoaderDownloadError", request.packageId));
                        }

                        if (isFinite(err)) {
                            if (request.logLevel > InstallLogLevel.silent) {
                                logger.logError(resources.getString("PackageLoaderNpmInstallFailedConsoleMessage"));
                            }

                            // 243 is the error code reported when npm fails due to EACCES
                            var errorCode: TacoErrorCodes = (err === 243) ? TacoErrorCodes.PackageLoaderNpmInstallFailedEaccess : TacoErrorCodes.PackageLoaderNpmInstallFailedWithCode;
                            deferred.reject(errorHelper.get(errorCode, request.packageName, err));
                        } else {
                            deferred.reject(errorHelper.wrap(TacoErrorCodes.PackageLoaderNpmInstallErrorMessage, err, request.packageName));
                        }
                    });
                    return deferred.promise;
                });
            });
        }

        private static updatePackageViaNPM(packageName: string, targetPath: string, logLevel?: InstallLogLevel): Q.Promise<any> {
            var cwd: string = path.resolve(targetPath, "..", "..");
            return TacoPackageLoader.runNpmCommand("update", packageName, cwd, null /* commandFlags */, logLevel)
                .catch(function (err: any): Q.Promise<void> {
                    var deferred: Q.Deferred<void> = Q.defer<void>();
                    rimraf(targetPath, function (): void {
                        if (isFinite(err)) {
                            // error code reported when npm fails due to EACCES
                            var errorCode: TacoErrorCodes = (err === 243) ? TacoErrorCodes.PackageLoaderNpmUpdateFailedEaccess : TacoErrorCodes.PackageLoaderNpmUpdateFailedWithCode;
                            deferred.reject(errorHelper.get(errorCode, packageName, err));
                        } else {
                            deferred.reject(errorHelper.wrap(TacoErrorCodes.PackageLoaderNpmUpdateErrorMessage, err, packageName));
                        }
                    });
                    return deferred.promise;
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
            return <T> require(packageTargetPath);
        }

        private static getStatusFilePath(targetPath: string): string {
            return path.resolve(targetPath, "..", "Installing.tmp");
        }

        private static removeStatusFile(targetPath: string): Q.Promise<any> {
            var statusFilePath: string = TacoPackageLoader.getStatusFilePath(targetPath);
            return Q.denodeify(fs.unlink)(statusFilePath);
        }

        private static packageNeedsInstall(targetPath: string): boolean {
            var statusFilePath: string = TacoPackageLoader.getStatusFilePath(targetPath);
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
                    return parseInt(data.toString(), 10);
                })
                .catch(function (error: any): number {
                    return -1;
                });
        }

        private static updateLastCheckTimestamp(targetPath: string): void {
            try {
                fs.writeFileSync(TacoPackageLoader.getTimestampFilePath(targetPath), Date.now().toString());
            } catch (e) {
                logger.logError(e);
                // report but otherwise ignore the error.
            }
        }
    }
}

export = TacoUtility;
