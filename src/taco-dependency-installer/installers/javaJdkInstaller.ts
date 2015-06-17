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
import installerProtocol = require ("../elevatedInstallerProtocol");
import installerUtils = require ("../utils/installerUtils");
import installerUtilsWin32 = require ("../utils/win32/installerUtilsWin32");
import resources = require ("../resources/resourceManager");
import tacoUtils = require ("taco-utils");

import ILogger = installerProtocol.ILogger;
import utils = tacoUtils.UtilHelper;

class JavaJdkInstaller extends InstallerBase {
    private installerFile: string;

    constructor(installerInfo: DependencyInstallerInterfaces.IInstallerData, softwareVersion: string, installTo: string, logger: ILogger) {
        super(installerInfo, softwareVersion, installTo, logger);
    }

    protected downloadWin32(): Q.Promise<any> {
        this.installerFile = path.join(InstallerBase.InstallerCache, "javaJdk", "win32", this.softwareVersion, path.basename(this.installerInfo.installSource));

        return this.downloadDefault();
    }

    protected installWin32(): Q.Promise<any> {
        var self = this;

        // Run installer
        var deferred: Q.Deferred<any> = Q.defer<any>();

        var commandLine: string = this.installerFile + " /quiet /norestart /lvx %temp%/javajdk7.0.550.13.log /INSTALLDIR=" + utils.quotesAroundIfNecessary(this.installDestination);

        childProcess.exec(commandLine, function (err: Error): void {
            if (err) {
                var code: number = (<any>err).code;

                if (code) {
                    deferred.reject(new Error(resources.getString("InstallerError", self.installerFile, code)));
                } else {
                    deferred.reject(new Error(resources.getString("CouldNotRunInstaller", self.installerFile, err.name)));
                }
            } else {
                deferred.resolve({});
            }
        });

        return deferred.promise;
    }

    protected updateVariablesWin32(): Q.Promise<any> {
        // Initialize values
        var javaHomeName: string = "JAVA_HOME";
        var javaHomeValue: string = this.installDestination;
        var addToPath: string = path.join(javaHomeValue, "bin");

        return installerUtilsWin32.setEnvironmentVariableIfNeededWin32(javaHomeName, javaHomeValue, this.logger)
            .then(function (): Q.Promise<any> {
                return installerUtilsWin32.addToPathIfNeededWin32([addToPath]);
            });
    }

    private downloadDefault(): Q.Promise<any> {
        // Prepare expected installer file properties
        var expectedProperties: installerUtils.IFileSignature = {
            bytes: this.installerInfo.bytes,
            sha1: this.installerInfo.sha1
        };

        // Set up cookie
        var cookieContents: string = "oraclelicense=accept-securebackup-cookie; domain=.oracle.com; path=/";
        var cookieUrl: string = "http://oracle.com";
        var j: request.CookieJar = request.jar();
        var cookie: request.Cookie = request.cookie(cookieContents);

        j.setCookie(cookie, cookieUrl);

        // Prepare download options
        var options: request.Options = {
            uri: this.installerInfo.installSource,
            method: "GET",
            jar: j
        };

        // Download the installer
        return installerUtils.downloadFile(options, this.installerFile, expectedProperties);
    }
}

export = JavaJdkInstaller;

/// <enable code="SA1400" />