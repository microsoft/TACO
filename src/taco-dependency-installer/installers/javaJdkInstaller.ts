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
import installerProtocol = require ("../installerProtocol");
import installerUtils = require ("../utils/installerUtils");
import resources = require ("../resources/resourceManager");
import tacoUtils = require ("taco-utils");

import utils = tacoUtils.UtilHelper;

class JavaJdkInstaller extends InstallerBase {
    private installerFile: string;

    constructor(installerInfo: DependencyInstallerInterfaces.IInstallerData, softwareVersion: string, installTo: string, socketHandle: NodeJSNet.Socket) {
        super(installerInfo, softwareVersion, installTo, socketHandle);
    }

    protected downloadWin32(): Q.Promise<any> {
        // Set installer download path
        this.installerFile = path.join(InstallerBase.InstallerCache, "java", this.softwareVersion, path.basename(this.installerInfo.installSource));

        // Prepare expected installer file properties
        var expectedProperties: installerUtils.IExpectedProperties = {
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

    protected installWin32(): Q.Promise<any> {
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
        // Initialize values
        var javaHomeName: string = "JAVA_HOME";
        var javaHomeValue: string = this.installDestination;
        var addToPath: string = path.join(javaHomeValue, "bin");

        return installerUtils.setEnvironmentVariableIfNeededWin32(javaHomeName, javaHomeValue, this.socketHandle)
            .then(function (): Q.Promise<any> {
                return installerUtils.addToPathIfNeededWin32(addToPath);
            });
    }
}

export = JavaJdkInstaller;

/// <enable code="SA1400" />