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

import admZip = require ("adm-zip");
import childProcess = require ("child_process");
import fs = require ("fs");
import os = require ("os");
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
    private installerDownloadPath: string;

    constructor(installerInfo: DependencyInstallerInterfaces.IInstallerData, softwareVersion: string, installTo: string, logger: ILogger, steps: DependencyInstallerInterfaces.IStepsDeclaration) {
        super(installerInfo, softwareVersion, installTo, logger, steps);
    }

    protected downloadWin32(): Q.Promise<any> {
        return this.downloadDefault();
    }

    protected installWin32(): Q.Promise<any> {
        var self = this;

        // Run installer
        var deferred: Q.Deferred<any> = Q.defer<any>();

        var commandLine: string = this.installerDownloadPath + " /quiet /norestart /lvx %temp%/javajdk7.0.550.13.log /INSTALLDIR=" + utils.quotesAroundIfNecessary(this.installDestination);

        childProcess.exec(commandLine, function (err: Error): void {
            if (err) {
                var code: number = (<any>err).code;

                if (code) {
                    deferred.reject(new Error(resources.getString("InstallerError", self.installerDownloadPath, code)));
                } else {
                    deferred.reject(new Error(resources.getString("CouldNotRunInstaller", self.installerDownloadPath, err.name)));
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

    protected downloadDarwin(): Q.Promise<any> {
        return this.downloadDefault();
    }

    protected installDarwin(): Q.Promise<any> {
        var self = this;

        return this.attachDmg()
            .then(function (): Q.Promise<any> {
                return self.installPkg();
            })
            .then(function (): Q.Promise<any> {
                return self.detachDmg();
            });
    }

    private attachDmg(): Q.Promise<any> {
        var deferred: Q.Deferred<any> = Q.defer<any>();
        var command: string = "hdiutil attach " + this.installDestination;

        childProcess.exec(command, function (error: Error, stdout: Buffer, stderr: Buffer): void {
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve({});
            }
        });

        return deferred.promise;
    }

    private installPkg(): Q.Promise<any> {
        var deferred: Q.Deferred<any> = Q.defer<any>();
        var pkgPath: string = path.join("/", "Volumes", "JDK 7 Update 55", "JDK 7 Update 55.pkg");
        var commandLine: string = "installer -pkg " + pkgPath + " -target \"/\"";

        childProcess.exec(commandLine, function (err: Error): void {
            if (err) {
                var code: number = (<any>err).code;

                if (code) {
                    deferred.reject(new Error(resources.getString("InstallerError", this.installerDownloadPath, code)));
                } else {
                    deferred.reject(new Error(resources.getString("CouldNotRunInstaller", this.installerDownloadPath, err.name)));
                }
            } else {
                deferred.resolve({});
            }
        });

        return deferred.promise;
    }

    private detachDmg(): Q.Promise<any> {
        var deferred: Q.Deferred<any> = Q.defer<any>();
        var command: string = "hdiutil detach /Volumes/JDK\ 7\ Update\ 55/";

        childProcess.exec(command, function (error: Error, stdout: Buffer, stderr: Buffer): void {
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve({});
            }
        });

        return deferred.promise;
    }

    private downloadDefault(): Q.Promise<any> {
        this.installerDownloadPath = path.join(InstallerBase.InstallerCache, "javaJdk", os.platform(), this.softwareVersion, path.basename(this.installerInfo.installSource));

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
        return installerUtils.downloadFile(options, this.installerDownloadPath, expectedProperties);
    }
}

export = JavaJdkInstaller;

/// <enable code="SA1400" />