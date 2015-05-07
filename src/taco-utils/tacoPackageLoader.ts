/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ * ******************************************************
﻿ */
/// <reference path="../typings/rimraf.d.ts" />
/// <reference path="../typings/semver.d.ts" />
"use strict";

import assert = require ("assert");
import child_process = require ("child_process");
import fs = require ("fs");
import mkdirp = require ("mkdirp");
import path = require ("path");
import rimraf = require ("rimraf");
import semver = require ("semver");
import Q = require ("q");

import loggerUtil = require ("./logger");
import UtilHelper = require ("./utilHelper");
import resources = require ("./resources/resourceManager");

import logger = loggerUtil.Logger;
import utils = UtilHelper.UtilHelper;

module TacoUtility {
    export enum PackageSpecType {
        Error = -1,
        Version = 0,
        Uri = 1,
        RelativePath = 2
    }

    export class TacoPackageLoader {
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
        public static lazyRequire<T>(packageName: string, packageVersion: string, options?: { logLevel?: string; basePath?: string }): Q.Promise<T> {
            options = options || {};
            var packageSpecType = TacoPackageLoader.getPackageSpecType(packageVersion);
            var packageTargetPath = TacoPackageLoader.getPackageTargetPath(packageName, packageVersion, packageSpecType);

            if (packageSpecType === PackageSpecType.RelativePath) {
                assert.ok(options.basePath);
                var relativePath = packageVersion.substring("file://".length);
                var absolutePath = path.resolve(options.basePath, relativePath);
                packageVersion = absolutePath;
            }

            return TacoPackageLoader.installPackageIfNeeded(packageName, packageVersion, packageTargetPath, packageSpecType, options.logLevel).then(function (): T {
                return TacoPackageLoader.requirePackage<T>(packageTargetPath);
            });
        }

        public static lazyRequireNoCache<T>(packageName: string, packageVersion: string, options?: { logLevel?: string; basePath?: string }): Q.Promise<T> {
            var requireCachePaths = Object.keys(require.cache);
            return TacoPackageLoader.lazyRequire<T>(packageName, packageVersion, options).finally(function (): void {
                // un-cache any files that were just required.
                Object.keys(require.cache).filter(function (key: string): boolean {
                    return requireCachePaths.indexOf(key) === -1;
                }).forEach(function (key: string): void {
                    delete require.cache[key];
                });
            });
        }

        /**
         * Perform a fresh install of a specified node module, even if it is already cached
         *
         * This method is resilient against interrupted downloads, but is not safe under concurrency.
         * Until that changes, we should not allow multiple builds at once.
         * 
         * @param {string} packageName The name of the package to load
         * @param {string} packageVersion The version of the package to load. Either a version number such that "npm install package@version" works, or a git url to clone
         * @param {string} logLevel Optional parameter which determines how much output from npm and git is filtered out. Follows the npm syntax: silent, warn, info, verbose, silly
         * @param {string} basePath Optional parameter which specifies the base path to resolve relative file paths against
         *
         * @returns {Q.Promise<any>} A promise which is either rejected with a failure to install, or resolved if the package installed succesfully
         */

        public static forceInstallPackage(packageName: string, packageVersion: string, options?: { logLevel?: string; basePath?: string }): Q.Promise<any> {
            options = options || {};
            var packageSpecType = TacoPackageLoader.getPackageSpecType(packageVersion);
            var packageTargetPath = TacoPackageLoader.getPackageTargetPath(packageName, packageVersion, packageSpecType);

            if (packageSpecType === PackageSpecType.RelativePath) {
                assert.ok(options.basePath);
                var relativePath = packageVersion.substring("file://".length);
                var absolutePath = path.resolve(options.basePath, relativePath);
                packageVersion = absolutePath;
            }

            // Intentionally create the status file, triggering a re-install
            var statusFilePath = TacoPackageLoader.getStatusFilePath(packageTargetPath);
            mkdirp.sync(packageTargetPath);
            fs.writeFileSync(statusFilePath, "Outdated");

            return TacoPackageLoader.installPackageIfNeeded(packageName, packageVersion, packageTargetPath, packageSpecType, options.logLevel);
        }

        private static installPackageViaNPM(packageName: string, packageVersion: string, packageTargetPath: string, specType: PackageSpecType, logLevel?: string): Q.Promise<any> {
            var deferred = Q.defer();
            try {
                mkdirp.sync(packageTargetPath);

                var args: string[] = ["install"];
                var cwd = packageTargetPath;
                // When installing from the online npm repo, we need to provide the package name and version, and 
                // we need to allow for the node_modules/ packagename folders to be added
                if (specType === PackageSpecType.Version) {
                    args.push(packageName + "@" + packageVersion);
                    cwd = path.resolve(cwd, "..", "..");
                }

                if (logLevel) {
                    args.push("--loglevel", logLevel);
                }

                var npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

                var npmProcess = child_process.spawn(npmCommand, args, { cwd: cwd, stdio: "inherit" });
                npmProcess.on("error", function (error: Error): void {
                    if (packageName === "cordova") {
                        logger.log("\n", logger.Level.Normal);
                        logger.log(resources.getString("packageLoader.errorMessage"), logger.Level.Error);
                        logger.log(resources.getString("packageLoader.downloadErrorMessage", resources.getString("packageLoader.cordovaToolVersion", packageVersion)), logger.Level.Error);
                        logger.log("\n", logger.Level.Normal);
                    }

                    rimraf(packageTargetPath, function (): void {
                        deferred.reject(error);
                    });
                });
                npmProcess.on("exit", function (exitCode: number): void {
                    if (exitCode === 0) {
                        if (packageName === "cordova") {
                            logger.log("\n", logger.Level.Normal);
                            logger.log(resources.getString("packageLoader.successMessage"), logger.Level.Success);
                            logger.log(resources.getString("packageLoader.downloadCompletedMessage", resources.getString("packageLoader.cordovaToolVersion", packageVersion)), logger.Level.Normal);
                            logger.log("\n", logger.Level.Normal);
                        }

                        deferred.resolve({});
                    } else {
                        rimraf(packageTargetPath, function (): void {
                            deferred.reject(new Error(resources.getString("packageLoaderNpmInstallFailed", packageName)));
                        });
                    }
                });
            } catch (err) {
                console.log(err);
                deferred.reject(err);
            }

            return deferred.promise;
        }

        private static getPackageTargetPath(packageName: string, packageVersion: string, packageSpecType: PackageSpecType): string {
            var homePackageModulesPath = path.join(utils.tacoHome, "node_modules", packageName);
            switch (packageSpecType) {
                case PackageSpecType.Version:
                    return path.join(homePackageModulesPath, packageVersion, "node_modules", packageName);
                case PackageSpecType.Uri:
                case PackageSpecType.RelativePath:
                    return path.join(homePackageModulesPath, encodeURIComponent(packageVersion), "node_modules", packageName);
                case PackageSpecType.Error:
                default:
                    return null;
            }
        }

        private static installPackageIfNeeded(packageName: string, packageVersion: string, targetPath: string, specType: PackageSpecType, logLevel: string): Q.Promise<string> {
            var deferred: Q.Deferred<string> = Q.defer<string>();
            if (specType === PackageSpecType.Error) {
                logger.log(resources.getString("packageLoader.invalidPackageVersionSpecifier", packageVersion, packageName), logger.Level.Error);
                deferred.reject(resources.getString("packageLoader.invalidPackageVersionSpecifier", packageVersion, packageName));
                return deferred.promise;
            }

            if (!TacoPackageLoader.packageNeedsInstall(targetPath)) {
                return Q(targetPath);
            }

            // Delete the target path if it already exists and create an empty folder
            if (fs.existsSync(targetPath)) {
                rimraf.sync(targetPath);
            }

            mkdirp.sync(targetPath);
            // Create a file 
            fs.closeSync(fs.openSync(TacoPackageLoader.getStatusFilePath(targetPath), "w"));

            return TacoPackageLoader.installPackage(packageName, packageVersion, targetPath, specType, logLevel).then(function (): Q.Promise<string> {
                return TacoPackageLoader.removeStatusFile(targetPath).then(function (): string {
                    return targetPath;
                });
            });
        }

        private static installPackage(packageName: string, packageVersion: string, targetPath: string, specType: PackageSpecType, logLevel: string): Q.Promise<any> {
            if (packageName === "cordova") {
                logger.log(resources.getString("packageLoader.downloadingMessage", packageVersion), logger.Level.NormalBold);
                logger.logLine(resources.getString("packageLoader.cordovaToolVersion", packageVersion), logger.Level.Normal);
                logger.log("\n", logger.Level.Normal);
            }

            switch (specType) {
                case PackageSpecType.Version:
                    return TacoPackageLoader.installPackageViaNPM(packageName, packageVersion, targetPath, specType, logLevel);
                case PackageSpecType.Uri:
                    return TacoPackageLoader.cloneGitRepo(packageVersion, targetPath, logLevel)
                        .then(function (): Q.Promise<any> {
                        return TacoPackageLoader.installPackageViaNPM(packageName, packageVersion, targetPath, specType, logLevel);
                        });
                case PackageSpecType.RelativePath:
                    return utils.copyRecursive(packageVersion, targetPath).then(function (): Q.Promise<any> {
                        return TacoPackageLoader.installPackageViaNPM(packageName, packageVersion, targetPath, specType, logLevel);
                    });
                case PackageSpecType.Error:
                default:
                    return Q.reject(new Error(resources.getString("packageLoader.invalidPackageVersionSpecifier", packageName, packageVersion)));
            }
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

        private static cloneGitRepo(gitUrl: string, cloneTargetPath: string, logLevel?: string): Q.Promise<boolean> {
            var deferred = Q.defer<boolean>();
            try {
                // Delete the target path if it already exists
                if (fs.existsSync(cloneTargetPath)) {
                    mkdirp.sync(cloneTargetPath);
                }

                var gitCommand = "git clone " + gitUrl + " " + cloneTargetPath;
                if (["verbose", "silly"].indexOf(logLevel) !== -1) {
                    gitCommand += " --verbose";
                }

                // Clone the GIT repository to the target path
                child_process.exec(gitCommand, {}, function (error: Error, stdout: Buffer, stderr: Buffer): void {
                    if (error) {
                        if (logLevel !== "silent") {
                            if (logLevel !== "warn") {
                                console.warn(stdout);
                            }

                            console.warn(stderr);
                            console.log(error);
                        }

                        rimraf(cloneTargetPath, function (error: Error): void {
                            deferred.reject(error);
                        });
                        deferred.reject(error);
                    } else {
                        deferred.resolve(true);
                    }
                });
            } catch (err) {
                deferred.reject(err);
            }

            return deferred.promise;
        }

        private static getPackageSpecType(packageVersion: string): PackageSpecType {
            // The package specification can either be a GIT url or an npm package version number
            var gitUrlRegex = new RegExp("^http(s?)\\:\/\/.*|.*\.git$");

            if (semver.valid(packageVersion)) {
                return PackageSpecType.Version;
            }

            if ((gitUrlRegex.exec(packageVersion))) {
                return PackageSpecType.Uri;
            }

            if (packageVersion.match(/file:\/\/\..*/)) {
                return PackageSpecType.RelativePath;
            }

            return PackageSpecType.Error;
        }

        private static packageNeedsInstall(targetPath: string): boolean {
            var statusFilePath = TacoPackageLoader.getStatusFilePath(targetPath);
            // if package.json doesn't exist or status file is still lingering around
            // it is an invalid installation
            return !fs.existsSync(path.join(targetPath, "package.json")) || fs.existsSync(statusFilePath);
        }
    }
}

export = TacoUtility;