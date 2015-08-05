/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/adm-zip.d.ts" />
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

import ILogger = installerProtocol.ILogger;

class AndroidSdkInstaller extends InstallerBase {
    private static AndroidHomeName: string = "ANDROID_HOME";

    private installerArchive: string;
    private androidHomeValue: string;

    constructor(installerInfo: DependencyInstallerInterfaces.IInstallerData, softwareVersion: string, installTo: string, logger: ILogger, steps: DependencyInstallerInterfaces.IStepsDeclaration) {
        super(installerInfo, softwareVersion, installTo, logger, steps);
    }

    protected downloadWin32(): Q.Promise<any> {
        return this.downloadDefault();
    }

    protected installWin32(): Q.Promise<any> {
        return this.installDefault();
    }

    protected updateVariablesWin32(): Q.Promise<any> {
        // Initialize values
        var androidHomeValue: string = path.join(this.installDestination, "android-sdk-windows");
        var addToPathTools: string = path.join(androidHomeValue, "tools");
        var addToPathPlatformTools: string = path.join(androidHomeValue, "platform-tools");

        this.androidHomeValue = androidHomeValue;

        return installerUtilsWin32.setEnvironmentVariableIfNeededWin32(AndroidSdkInstaller.AndroidHomeName, androidHomeValue, this.logger)
            .then(function (): Q.Promise<any> {
                return installerUtilsWin32.addToPathIfNeededWin32([addToPathTools, addToPathPlatformTools]);
            });
    }

    protected postInstallWin32(): Q.Promise<any> {
        return this.postInstallDefault();
    }

    protected downloadDarwin(): Q.Promise<any> {
        return this.downloadDefault();
    }

    protected installDarwin(): Q.Promise<any> {
        return this.installDefault();
    }

    protected updateVariablesDarwin(): Q.Promise<any> {
        var deferred: Q.Deferred<any> = Q.defer<any>();

        // Initialize values
        var androidHomeValue: string = path.join(this.installDestination, "android-sdk-macosx");
        var addToPathTools: string = "$" + AndroidSdkInstaller.AndroidHomeName + "/tools/";
        var addToPathPlatformTools: string = "$" + AndroidSdkInstaller.AndroidHomeName + "/platform-tools/";
        var newPath: string = "\"" + addToPathTools + "\":\"" + addToPathPlatformTools + "\":\"$PATH\"";
        var appendToBashProfile: string = "\n# Android SDK\nexport ANDROID_HOME=" + androidHomeValue + "\nexport PATH=" + newPath;
        var updateCommand: string = "echo '" + appendToBashProfile + "' >>~/.bash_profile";

        this.androidHomeValue = androidHomeValue;

        // Add Android values in ~/.bash_profile
        childProcess.exec(updateCommand, function (error: Error, stdout: Buffer, stderr: Buffer): void {
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve({});
            }
        });

        return deferred.promise;
    }

    protected postInstallDarwin(): Q.Promise<any> {
        var self = this;

        return this.addExecutePermission()
            .then(function (): Q.Promise<any> {
                return self.postInstallDefault();
            });
    }

    private downloadDefault(): Q.Promise<any> {
        this.installerArchive = path.join(InstallerBase.InstallerCache, "androidSdk", os.platform(), this.softwareVersion, path.basename(this.installerInfo.installSource));

        // Prepare expected archive file properties
        var expectedProperties: installerUtils.IFileSignature = {
            bytes: this.installerInfo.bytes,
            sha1: this.installerInfo.sha1
        };

        // Prepare download options
        var options: request.Options = {
            uri: this.installerInfo.installSource,
            method: "GET",
        };

        // Download the archive
        return installerUtils.downloadFile(options, this.installerArchive, expectedProperties);
    }

    private installDefault(): Q.Promise<any> {
        // Extract the archive
        var templateZip = new admZip(this.installerArchive);

        if (!fs.existsSync(this.installDestination)) {
            wrench.mkdirSyncRecursive(this.installDestination, 511); // 511 decimal is 0777 octal
        }

        templateZip.extractAllTo(this.installDestination);

        return Q.resolve({});
    }

    private addExecutePermission(): Q.Promise<any> {
        var deferred: Q.Deferred<any> = Q.defer<any>();
        var command: string = "chmod a+x " + path.join(this.androidHomeValue, "tools", "android");

        childProcess.exec(command, function (error: Error, stdout: Buffer, stderr: Buffer): void {
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve({});
            }
        });

        return deferred.promise;
    }

    private postInstallDefault(): Q.Promise<any> {
        // Install Android packages
        var deferred: Q.Deferred<any> = Q.defer<any>();
        var androidCommand: string = os.platform() === "win32" ? "android.bat" : "android";
        var command: string = path.join(this.androidHomeValue, "tools", androidCommand);
        var androidPackages: string[] = [
            "tools",
            "platform-tools",
            "extra-android-support",
            "extra-android-m2repository",
            "build-tools-19.1.0",
            "build-tools-21.1.2",
            "build-tools-22.0.1",
            "android-19",
            "android-21",
            "android-22"
        ];
        var args: string[] = [
            "update",
            "sdk",
            "-u",
            "-a",
            "--filter",
            androidPackages.join(",")
        ];
        var errorOutput: string = "";
        var cp: childProcess.ChildProcess = childProcess.spawn(command, args);

        cp.stdout.on("data", function (data: Buffer): void {
            var stringData = data.toString();

            if (/\[y\/n\]:/.test(stringData)) {
                // Accept license terms
                cp.stdin.write("y" + os.EOL);
            }
        });
        cp.stderr.on("data", function (data: Buffer): void {
            errorOutput += data.toString();
        });
        cp.on("error", function (err: Error): void {
            deferred.reject(err);
        });
        cp.on("exit", function (code: number): void {
            if (errorOutput) {
                deferred.reject(new Error(errorOutput));
            } else {
                deferred.resolve({});
            }
        });

        return deferred.promise;
    }
}

export = AndroidSdkInstaller;

/// <enable code="SA1400" />