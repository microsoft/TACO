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

        private static installPackageFromNPM<T>(packageName: string, packageVersion: string, packageTargetPath: string): Q.Promise<T> {
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
    }
}

export = TacoUtility;