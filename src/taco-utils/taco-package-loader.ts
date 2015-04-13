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
import UtilHelper = require ("./util-helper");
import utils = UtilHelper.UtilHelper;
import ResUtil =  require("./resources-manager");
import resources = ResUtil.ResourcesManager;
import loggerUtil = require("./logger");
import logger = loggerUtil.Logger;

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
         * @param {string} packageName The name of the package to load
         * @param {string} packageVersion The version of the package to load. Either a version number such that "npm install package@version" works, or a git url to clone
         *
         * @returns {Q.Promise<T>} A promise which is either rejected with a failure to install, or resolved with the require()'d package
         */
        public static lazyRequire<T>(packageName: string, packageVersion: string): Q.Promise<T> {
            var deferred = Q.defer<T>();
            var packageTargetPath: string;
            TacoPackageLoader.lazyAcquire(packageName, packageVersion).
                then(function (packageTargetPath) :Q.Promise<T> {
                var pkg = <T>require(packageTargetPath);
                return Q.resolve(pkg);
            }).
                fail(function (error) {
                TacoPackageLoader.cleanFolderOnFailure(packageTargetPath);
                console.log(error);
                throw error;
            });
            return deferred.promise;
        }

        /**
         * Acquires a node package with specified version. If the package is not already downloaded,
         * then first download the package and cache it locally for future loads.
         *
         * @param {string} packageName The name of the package to load
         * @param {string} packageVersion The version of the package to load. Either a version number such that "npm install package@version" works, or a git url to clone
         *
         * @returns {Q.Promise<any>} A promise which is either rejected with a failure to install, or resolved with the path of the acquired package
         */
        private static lazyAcquire(packageName: string, packageVersion: string): Q.Promise<any> {
            var packageSpecType: PackageSpecType = TacoPackageLoader.getPackageSpecType(packageVersion);

            if (packageSpecType == PackageSpecType.Error) {
                return Q.reject("Invalid CLI version : " + packageVersion);
            }

            var packageTargetPath = TacoPackageLoader.getPackageTargetPath(packageName, packageVersion, packageSpecType);

            return TacoPackageLoader.installPackageIfNecessary(packageName, packageVersion, packageTargetPath, packageSpecType).
                then(function () {
                var pkg = require(packageTargetPath);
                return Q.resolve(packageTargetPath);
            }).
                fail(function (error) {
                    TacoPackageLoader.cleanFolderOnFailure(packageTargetPath);
                console.log(error);
                throw error;
            });
        }

        private static getPackageTargetPath(packageName: string, packageVersion: string, packageSpecType: PackageSpecType) : string  {
            var moduleRootPath: string = path.join(utils.tacoHome, "node_modules", packageName);
            switch (packageSpecType) {
                case PackageSpecType.Version:
                    return path.join(moduleRootPath, packageVersion, 'node_modules', 'cordova');
                case PackageSpecType.Uri:
                    return path.join(moduleRootPath, encodeURIComponent(packageVersion), 'node_modules', 'cordova');
                case PackageSpecType.Error:
                default:
                    return null;
            }
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

        private static cloneGitRepo(gitUrl: string, cloneTargetPath: string): Q.Promise<boolean> {
            var deferred = Q.defer<boolean>();
            try {
                // Delete the target path if it already exists
                if (fs.existsSync(cloneTargetPath)) {
                    mkdirp.sync(cloneTargetPath);
                }

                // Clone the GIT repository to the target path
                utils.loggedExec("git clone " + gitUrl + " " + cloneTargetPath, {}, function (error: Error, stdout: Buffer, stderr: Buffer): void {
                    if (error) {
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

        private static npmInstallPackage(packageName: string, packageVersion: string, packageTargetPath: string, packageSpecType: PackageSpecType): Q.Promise<any> {
            var deferred = Q.defer();

            var args = ['/c', 'npm', 'install'];

            var dir = packageTargetPath;
            if (packageSpecType == PackageSpecType.Version) {
                args.push('cordova' + '@' + packageVersion);
                // actual install happens 2 directories down. {dir}\node_modules\cordova
                dir = path.resolve(packageTargetPath, "..", "..");
            }

            utils.loggedExec("npm install " + packageName + "@" + packageVersion, { cwd: dir }, function (error: Error, stdout: Buffer, stderr: Buffer): void {
                if (error) {
                    rimraf(packageTargetPath, function (error: Error): void {
                        deferred.reject(error);
                    });
                    if (packageName == 'cordova') {
                        logger.log(resources.getString("packageLoader.errorMessage"), logger.Level.Error);
                        logger.log(resources.getString("packageLoader.downloadErrorMessage", resources.getString("packageLoader.cordovaToolVersion", packageVersion)), logger.Level.Error);
                        logger.log("\n", logger.Level.Normal);
                    }
                    deferred.reject(error);
                } else {
                    if (packageName == 'cordova') {
                        logger.log(resources.getString("packageLoader.successMessage"), logger.Level.Success);
                        logger.log(resources.getString("packageLoader.downloadCompletedMessage", resources.getString("packageLoader.cordovaToolVersion", packageVersion)), logger.Level.Normal);
                        logger.log("\n", logger.Level.Normal);
                    }
                    deferred.resolve(packageTargetPath);
                }
                
            });
            return deferred.promise;
        }

        private static installPackage(packageName: string, packageVersion: string, packageTargetPath: string, packageSpecType: PackageSpecType): Q.Promise<any> {
            logger.log(resources.getString("packageLoader.downloadingMessage", packageVersion), logger.Level.NormalBold);
            logger.logLine(resources.getString("packageLoader.cordovaToolVersion", packageVersion), logger.Level.Normal);
            logger.log("\n", logger.Level.Normal);
            switch (packageSpecType) {
                case PackageSpecType.Version:
                    return TacoPackageLoader.npmInstallPackage(packageName, packageVersion, packageTargetPath, packageSpecType);
                    break;

                case PackageSpecType.Uri:
                    return TacoPackageLoader.cloneGitRepo(packageVersion, packageTargetPath).
                        then(function () {
                            return TacoPackageLoader.npmInstallPackage(packageName, packageVersion, packageTargetPath, packageSpecType);
                    });
                    break;

                case PackageSpecType.Error:
                default:
                    return Q.reject('Invalid package version: ' + packageName + '@' + packageVersion);
            }
        }

        private static npmInstallNeeded(packageTargetPath: string): boolean {
            var statusFilePath = TacoPackageLoader.getStatusFilePath(packageTargetPath);
            // if package.json doesn't exist or status file is still lingering around
            // it is an invalid installation
            return !fs.existsSync(path.join(packageTargetPath, 'package.json')) || fs.existsSync(statusFilePath);
        }

        private static getStatusFilePath(packageTargetPath: string): string {
            return path.join(packageTargetPath, '..', 'Installing.tmp')
        }

        private static removeStatusFile(packageTargetPath: string): Q.Promise<any> {
            var deferred = Q.defer();
            try {
                fs.unlinkSync(TacoPackageLoader.getStatusFilePath(packageTargetPath));
                deferred.resolve({});

            } catch (e) {
                deferred.reject(e);
            }
            return deferred.promise;
        }

        private static cleanFolderOnFailure(folder: string): void {
            folder = path.resolve(folder, "..", "..");
            if (fs.existsSync(folder)) {
                rimraf.sync(folder);
            }
        }

        private static installPackageIfNecessary(packageName: string, packageVersion: string, packageTargetPath: string, packageSpecType: PackageSpecType): Q.Promise<any> {
            var deferred = Q.defer();
            if (!TacoPackageLoader.npmInstallNeeded(packageTargetPath)) {
                deferred.resolve({});
                return deferred.promise;
            }
    
            // Delete the target path if it already exists and create an empty folder
            if (fs.existsSync(packageTargetPath)) {
                rimraf.sync(packageTargetPath);
            }

            mkdirp.sync(packageTargetPath);
            fs.closeSync(fs.openSync(TacoPackageLoader.getStatusFilePath(packageTargetPath), 'w'));

            return TacoPackageLoader.installPackage(packageName, packageVersion, packageTargetPath, packageSpecType).then(function () {
                return TacoPackageLoader.removeStatusFile(packageTargetPath);
            })
        }

    }
}

export = TacoUtility;