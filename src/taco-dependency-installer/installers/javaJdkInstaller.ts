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
import request = require("request");
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

        // Set installer download path
        this.installerFile = path.join(InstallerBase.InstallerCache, "java", this.softwareVersion, path.basename(this.installerInfo.installSource));

        // If we already have an installer present, verify if the file is uncorrupt
        if (fs.existsSync(this.installerFile)) {
            if (installerUtils.isInstallerFileClean(this.installerFile, this.installerInfo.sha1, this.installerInfo.bytes)) {
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

        return installerUtils.downloadFile(options, this.installerFile, this.installerInfo.sha1, this.installerInfo.bytes);
    }

    protected installWin32(): Q.Promise<any> {
        logger.logLine(resources.getString("InstallingLabel"));

        // More info on installation through command line for Windows 7 at http://docs.oracle.com/javase/7/docs/webnotes/install/windows/jdk-installation-windows.html
        // For Windows 8: http://docs.oracle.com/javase/8/docs/technotes/guides/install/windows_jdk_install.html#CHDHHBDD
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
        logger.logLine(resources.getString("SettingSystemVariablesLabel"));
        return Q.resolve({});
    }
}

export = JavaJdkInstaller;

/// <enable code="SA1400" />