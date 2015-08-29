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

/// <disable code="SA1400" justification="protected statements are currently broken in StyleCop" />

"use strict";

import admZip = require ("adm-zip");
import childProcess = require ("child_process");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import request = require ("request");

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
    private darwinMountpointName: string;

    constructor(installerInfo: DependencyInstallerInterfaces.IInstallerData, softwareVersion: string, installTo: string, logger: ILogger, steps: DependencyInstallerInterfaces.IStepsDeclaration) {
        super(installerInfo, softwareVersion, installTo, logger, steps, "java");
    }

    protected downloadWin32(): Q.Promise<any> {
        return this.downloadDefault();
    }

    protected installWin32(): Q.Promise<any> {
        var self = this;
        var deferred: Q.Deferred<any> = Q.defer<any>();

        // Make sure we have an install location
        if (!this.installDestination) {
            this.telemetry.add("error.description", "InstallDestination needed on installWin32", /*isPii*/ false);
            deferred.reject(new Error(resources.getString("NeedInstallDestination")));
        }

        // Run installer
        var commandLine: string = this.installerDownloadPath + " /quiet /norestart /lvx %temp%/javajdk.log /INSTALLDIR=" + utils.quotesAroundIfNecessary(this.installDestination);

        childProcess.exec(commandLine, function (err: Error): void {
            if (err) {
                this.telemetry.addError(err);
                var code: number = (<any>err).code;
                if (code) {
                    this.telemetry
                        .add("error.description", "InstallerError on installWin32", /*isPii*/ false)
                        .add("error.code", code, /*isPii*/ false);
                    deferred.reject(new Error(resources.getString("InstallerError", self.installerDownloadPath, code)));
                } else {
                    this.telemetry
                        .add("error.description", "CouldNotRunInstaller on installWin32", /*isPii*/ false)
                        .add("error.name", err.name, /*isPii*/ false);
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
            .finally(function (): Q.Promise<any> {
                return self.detachDmg();
            });
    }

    private attachDmg(): Q.Promise<any> {
        var self = this;
        var deferred: Q.Deferred<any> = Q.defer<any>();
        var command: string = "hdiutil attach " + this.installerDownloadPath;

        childProcess.exec(command, function (error: Error, stdout: Buffer, stderr: Buffer): void {
            // Save the mounted volume's name
            var stringOutput: string = stdout.toString();
            var capturedResult: string[] = /\/Volumes\/(.+)/.exec(stringOutput);

            self.darwinMountpointName = capturedResult[1];

            if (error) {
                this.telemetry
                    .add("error.description", "ErrorOnChildProcess on attachDmg", /*isPii*/ false)
                    .addError(error);
                deferred.reject(error);
            } else {
                deferred.resolve({});
            }
        });

        return deferred.promise;
    }

    private installPkg(): Q.Promise<any> {
        var self = this;
        var deferred: Q.Deferred<any> = Q.defer<any>();
        var pkgPath: string = path.join("/", "Volumes", this.darwinMountpointName, this.darwinMountpointName + ".pkg");
        var commandLine: string = "installer -pkg \"" + pkgPath + "\" -target \"/\"";

        childProcess.exec(commandLine, function (err: Error): void {
            if (err) {
                this.telemetry.addError(err);
                var code: number = (<any>err).code;
                if (code) {
                    this.telemetry
                        .add("error.description", "InstallerError on installPkg", /*isPii*/ false)
                        .add("error.code", code, /*isPii*/ false);
                    deferred.reject(new Error(resources.getString("InstallerError", self.installerDownloadPath, code)));
                } else {
                    this.telemetry
                        .add("error.description", "CouldNotRunInstaller on installPkg", /*isPii*/ false)
                        .add("error.name", err.name, /*isPii*/ false);
                    deferred.reject(new Error(resources.getString("CouldNotRunInstaller", self.installerDownloadPath, err.name)));
                }
            } else {
                deferred.resolve({});
            }
        });

        return deferred.promise;
    }

    private detachDmg(): Q.Promise<any> {
        var deferred: Q.Deferred<any> = Q.defer<any>();
        var mountPath: string = path.join("/", "Volumes", this.darwinMountpointName);
        var command: string = "hdiutil detach \"" + mountPath + "\"";

        childProcess.exec(command, function (error: Error, stdout: Buffer, stderr: Buffer): void {
            if (error) {
                this.telemetry
                    .add("error.description", "ErrorOnChildProcess on detachDmg", /*isPii*/ false)
                    .addError(error);
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