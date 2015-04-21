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

import child_process = require ("child_process");
import fs = require ("fs");
import mkdirp = require ("mkdirp");
import path = require ("path");
import rimraf = require ("rimraf");
import semver = require ("semver");
import Q = require ("q");
import UtilHelper = require ("./utilHelper");
import ResourcesManager = require ("./resourcesManager");
import utils = UtilHelper.UtilHelper;
import resources = ResourcesManager.ResourcesManager;

module TacoUtility {
    export enum PackageSpecType {
        Error = -1,
        Version = 0,
        Uri = 1
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
        public static lazyRequire<T>(packageName: string, packageVersion: string, logLevel?: string): Q.Promise<T> {
            var packageSpecType = TacoPackageLoader.getPackageSpecType(packageVersion);
            var packageTargetPath = TacoPackageLoader.getPackageTargetPath(packageName, packageVersion, packageSpecType);
           
            return TacoPackageLoader.installPackageIfNeeded(packageName, packageVersion, packageTargetPath, packageSpecType, logLevel).then(function (): T {
                return TacoPackageLoader.requirePackage<T>(packageTargetPath);
            });
        }

        private static requirePackage<T>(packageTargetPath: string): T {
            return <T>require(packageTargetPath);
        }

        private static getPackageTargetPath(packageName: string, packageVersion: string, packageSpecType: PackageSpecType): string {
            var homePackageModulesPath = path.join(utils.tacoHome, "node_modules", packageName);
            switch (packageSpecType) {
                case PackageSpecType.Version:
                    return path.join(homePackageModulesPath, packageVersion, "node_modules", packageName);
                case PackageSpecType.Uri:
                    return path.join(homePackageModulesPath, encodeURIComponent(packageVersion), "node_modules", packageName);
                case PackageSpecType.Error:
                default:
                    return null;
            }
        }

        private static installPackageIfNeeded(packageName: string, packageVersion: string, targetPath: string, specType: PackageSpecType, logLevel: string): Q.Promise<string> {
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
            switch (specType) {
                case PackageSpecType.Version:
                    return TacoPackageLoader.installPackageViaNPM(packageName, packageVersion, targetPath, specType, logLevel);
                case PackageSpecType.Uri:
                    return TacoPackageLoader.cloneGitRepo(packageVersion, targetPath, logLevel)
                    .then(function (): Q.Promise<any> {
                            return TacoPackageLoader.installPackageViaNPM(packageName, packageVersion, targetPath, specType, logLevel);
                    });
                case PackageSpecType.Error:
                default:
                    return Q.reject(new Error(resources.getString("InvalidPackageVersionSpecifier", packageName, packageVersion)));
            }
        }

        private static packageNeedsInstall(targetPath: string): boolean {
            var statusFilePath = TacoPackageLoader.getStatusFilePath(targetPath);
            // if package.json doesn't exist or status file is still lingering around
            // it is an invalid installation
            return !fs.existsSync(path.join(targetPath, "package.json")) || fs.existsSync(statusFilePath);
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

            return PackageSpecType.Error;
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
                    rimraf(packageTargetPath, function (): void {
                        deferred.reject(error);
                    });
                });
                npmProcess.on("exit", function (exitCode: number): void {
                    if (exitCode === 0) {
                        deferred.resolve({});
                    } else {
                        rimraf(packageTargetPath, function (): void {
                            deferred.reject(new Error("NpmInstallFailed"));
                        });
                    }
                });
            } catch (err) {
                console.log(err);
                deferred.reject(err);
            }

            return deferred.promise;
        }
    }
}

export = TacoUtility;