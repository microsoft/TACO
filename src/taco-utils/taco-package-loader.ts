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
        /** TODO - Remove and use lazyAcquire instead **/
        public static lazyRequire<T>(packageName: string, packageVersion: string): Q.Promise<T> {
            var packageTargetPath: string;
            var deferred = Q.defer<T>();

            var homeCordovaModulesPath = path.join(utils.tacoHome, "node_modules", packageName);
            switch (TacoPackageLoader.getPackageSpecType(packageVersion)) {
                case PackageSpecType.Version: {
                    packageTargetPath = path.join(homeCordovaModulesPath, packageVersion, "node_modules");
                    if (!fs.existsSync(path.join(packageTargetPath, packageName, "package.json"))) {
                        TacoPackageLoader.installPackageFromNPM<T>(packageName, packageVersion, packageTargetPath).then(function (pkg: T): void {
                            deferred.resolve(pkg);
                        }, function (err: any): void {
                                deferred.reject(err);
                            });
                    } else {
                        try {
                            var pkg = <T>require(path.join(packageTargetPath, packageName));
                            deferred.resolve(pkg);
                        } catch (e) {
                            deferred.reject(e);
                        }
                    }
                }

                    break;
                case PackageSpecType.Uri: {
                    packageTargetPath = path.join(homeCordovaModulesPath, "temp-remote", packageName);
                    if (fs.existsSync(path.join(packageTargetPath))) {
                        rimraf.sync(packageTargetPath);
                    }

                    TacoPackageLoader.cloneGitRepo(packageVersion, packageTargetPath).then(function (): void {
                        utils.loggedExec("npm install", { cwd: packageTargetPath }, function (error: Error, stdout: Buffer, stderr: Buffer): void {
                            if (error) {
                                rimraf(packageTargetPath, function (error: Error): void {
                                    if (error) {
                                        deferred.reject(error);
                                    }
                                });
                                deferred.reject(error);
                            } else {
                                try {
                                    var pkg = <T>require(path.join(packageTargetPath, packageName));
                                    deferred.resolve(pkg);
                                } catch (e) {
                                    deferred.reject(e);
                                }
                            }
                        });
                    }).catch(function (err: any): void {
                        deferred.reject(err);
                    });
                }

                    break;
                case PackageSpecType.Error:
                default: {
                    deferred.reject(new Error("Unknown package version"));
                }
            }

            return deferred.promise;
        }

        public static installPackageFromNPM<T>(packageName: string, packageVersion: string, packageTargetPath: string): Q.Promise<T> {
            var deferred = Q.defer<T>();
            try {
                mkdirp.sync(packageTargetPath);

                utils.loggedExec("npm install " + packageName + "@" + packageVersion, { cwd: packageTargetPath }, function (error: Error, stdout: Buffer, stderr: Buffer): void {
                    if (error) {
                        rimraf(packageTargetPath, function (error: Error): void {
                            deferred.reject(error);
                        });
                        deferred.reject(error);
                    } else {
                        var pkg = <T>require(path.join(packageTargetPath, packageName));
                        deferred.resolve(pkg);
                    }
                });
            } catch (err) {
                console.log(err);
                deferred.reject(err);
            }

            return deferred.promise;
        }

        private static lazyAcquire(packageName: string, packageVersion: string): Q.Promise<any> {
            var packageSpecType: PackageSpecType = TacoPackageLoader.getPackageSpecType(packageVersion);

            if (packageSpecType == PackageSpecType.Error) {
                return Q.reject('Invalid CLI version : '+ packageVersion);
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

            var cwd = packageTargetPath;
            if (packageSpecType == PackageSpecType.Version) {
                args.push('cordova' + '@' + packageVersion);
                // actual install happens 2 directories down. {cwd}\node_modules\cordova
                cwd = path.resolve(packageTargetPath, "..", "..");
            }

            utils.loggedExec("npm install " + packageName + "@" + packageVersion, { cwd: packageTargetPath }, function (error: Error, stdout: Buffer, stderr: Buffer): void {
                if (error) {
                    rimraf(packageTargetPath, function (error: Error): void {
                        deferred.reject(error);
                    });
                    deferred.reject(error);
                } else {
                    deferred.resolve(packageTargetPath);
                }
            });

            return deferred.promise;
        }

        private static installPackage(packageName: string, packageVersion: string, packageTargetPath: string, packageSpecType: PackageSpecType): Q.Promise<any> {
            switch (packageSpecType) {
                case PackageSpecType.Version:
                    console.log('Installing Cordova Version', packageName + '@' + packageVersion);
                    return TacoPackageLoader.npmInstallPackage(packageName, packageVersion, packageTargetPath, packageSpecType);
                    break;

                case PackageSpecType.Uri:
                    console.log('Installing Cordova From GIT Repo', packageVersion);
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
                if (packageSpecType == PackageSpecType.Uri) {
                    console.log("InstalledCordovaToolsFromGit", packageVersion);
                } else {
                    console.log("InstalledCordovaVersionSame", packageVersion);
                }
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