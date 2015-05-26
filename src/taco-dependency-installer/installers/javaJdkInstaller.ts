/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/dependencyInstallerInterfaces.d.ts" />
/// <reference path="../../typings/Q.d.ts" />
/// <reference path="../../typings/request.d.ts" />
/// <reference path="../../typings/wrench.d.ts" />

/// <disable code="SA1400" justification="protected statements are currently broken in StyleCop" />

"use strict";

import childProcess = require ("child_process");
import fs = require ("fs");
import path = require ("path");
import Q = require ("q");
import request = require ("request");
import wrench = require ("wrench");

import InstallerBase = require ("./installerBase");
import installerUtils = require ("../utils/installerUtils");
import resources = require ("../resources/resourceManager");
import tacoUtils = require ("taco-utils");

import logger = tacoUtils.Logger;
import utils = tacoUtils.UtilHelper;

class JavaJdkInstaller extends InstallerBase {
    private installerFile: string;

    constructor(installerInfo: DependencyInstallerInterfaces.IInstallerData, softwareVersion: string, installTo: string) {
        super(installerInfo, softwareVersion, installTo);
    }

    protected downloadWin32(): Q.Promise<any> {
        // Log progress
        logger.logLine(resources.getString("DownloadingLabel"));
        //return Q.resolve({}); // TEMP
        // Set installer download path
        this.installerFile = path.join(InstallerBase.InstallerCache, "java", this.softwareVersion, path.basename(this.installerInfo.installSource));

        // Prepare expected installer file properties
        var expectedProperties: installerUtils.IExpectedProperties = {
            bytes: this.installerInfo.bytes,
            sha1: this.installerInfo.sha1
        };

        // If we already have an installer present, verify if the file is uncorrupt
        if (fs.existsSync(this.installerFile)) {
            if (installerUtils.isInstallerFileClean(this.installerFile, expectedProperties)) {
                // We already have a clean installer for this version, use this one rather than downloading a new one
                return Q.resolve({});
            } else {
                // The installer we have in the cache is not the expected one; delete it
                fs.unlinkSync(this.installerFile);
            }
        } else {
            wrench.mkdirSyncRecursive(path.dirname(this.installerFile), 511); // 511 decimal is 0777 octal
        }

        // Set up cookie
        var cookieContents: string = "oraclelicense=accept-securebackup-cookie; domain=.oracle.com; path=/";
        var cookieUrl: string = "http://oracle.com";
        var j: request.CookieJar = request.jar();
        var cookie: request.Cookie = request.cookie(cookieContents);

        j.setCookie(cookie, cookieUrl);

        // Download the installer
        var options: request.Options = {
            uri: this.installerInfo.installSource,
            method: "GET",
            jar: j
        };

        return installerUtils.downloadFile(options, this.installerFile, expectedProperties);
    }

    protected installWin32(): Q.Promise<any> {
        // Log progress
        logger.logLine(resources.getString("InstallingLabel"));
        //return Q.resolve({}); // TEMP
        // Run installer
        var deferred: Q.Deferred<any> = Q.defer<any>();
        var commandLine: string = this.installerFile + " /quiet /norestart /lvx %temp%/javajdk7.0.550.13.log /INSTALLDIR=" + utils.quotesAroundIfNecessary(this.installDestination);

        childProcess.exec(commandLine, function (error: Error): void {
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve({});
            }
        });

        return deferred.promise;
    }

    protected updateVariablesWin32(): Q.Promise<any> {
        // Log progress
        logger.logLine(resources.getString("SettingSystemVariablesLabel"));

        // Initialize values
        var javaHomeName: string = "JAVA_HOME";
        var javaHomeValue: string = this.installDestination;
        var pathName: string = "Path";
        var appendToPath: string = "%" + javaHomeName + "%" + path.sep + "bin";

        return this.mustSetJavaHome(javaHomeName)
            .then(function (mustSetJavaHome: boolean): Q.Promise<any> {
                // Set JAVA_HOME if needed
                if (mustSetJavaHome) {
                    return installerUtils.setEnvironmentVariableWin32(javaHomeName, javaHomeValue);
                }

                return Q.resolve({});
            })
            .then(function (): Q.Promise<any> {
                // Determine if we need to modify the Path variable
                var pathValue: string = process.env[pathName];

                if (pathValue.indexOf(appendToPath) !== -1) {
                    // No need to change the path
                    return Q.resolve({});
                }

                pathValue = appendToPath + ";" + pathValue;

                return installerUtils.setEnvironmentVariableWin32(pathName, pathValue);
            });
    }

    private mustSetJavaHome(javaHomeName: string): Q.Promise<boolean> {
        if (!process.env[javaHomeName]) {
            return Q.resolve(true);
        }

        logger.logWarnLine(resources.getString("SystemVariableExists", javaHomeName));

        return installerUtils.promptUser(resources.getString("YesExampleString"))
            .then(function (answer: string): Q.Promise<boolean> {
                if (answer === resources.getString("YesString")) {
                    return Q.resolve(true);
                } else {
                    return Q.resolve(false);
                }
            });
    }
}

export = JavaJdkInstaller;

/// <enable code="SA1400" />