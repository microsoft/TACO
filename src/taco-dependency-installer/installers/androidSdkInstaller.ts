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
    private installerArchive: string;
    private androidHomeValue: string;

    constructor(installerInfo: DependencyInstallerInterfaces.IInstallerData, softwareVersion: string, installTo: string, logger: ILogger) {
        super(installerInfo, softwareVersion, installTo, logger);
    }

    protected downloadWin32(): Q.Promise<any> {
        this.installerArchive = path.join(InstallerBase.InstallerCache, "androidSdk", "win32", this.softwareVersion, path.basename(this.installerInfo.installSource));

        return this.downloadDefault();
    }

    protected installWin32(): Q.Promise<any> {
        return this.installDefault();
    }

    protected updateVariablesWin32(): Q.Promise<string> {
        // Initialize values
        var androidHomeName: string = "ANDROID_HOME";
        var androidHomeValue: string = path.join(this.installDestination, "android-sdk-windows");
        var addToPathTools: string = path.join(androidHomeValue, "tools");
        var addToPathPlatformTools: string = path.join(androidHomeValue, "platform-tools");

        this.androidHomeValue = androidHomeValue;

        return installerUtilsWin32.setEnvironmentVariableIfNeededWin32(androidHomeName, androidHomeValue, this.logger)
            .then(function (): Q.Promise<any> {
                return installerUtilsWin32.addToPathIfNeededWin32([addToPathTools, addToPathPlatformTools]);
            });
    }

    protected postInstall(): Q.Promise<any> {
        // For post-install step we have to do the progress logging manually
        this.logger.log(resources.getString("ConfiguringLabel"));

        // Install Android packages
        var deferred: Q.Deferred<any> = Q.defer<any>();
        var command: string = path.join(this.androidHomeValue, "tools", "android.bat");
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
            "android-22",
            "sys-img-armeabi-v7a-android-19",
            "sys-img-x86-android-19",
            "addon-google_apis_x86-google-19",
            "addon-google_apis-google-19"
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

    private downloadDefault(): Q.Promise<any> {
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
}

export = AndroidSdkInstaller;

/// <enable code="SA1400" />