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
import path = require ("path");
import Q = require ("q");
import request = require ("request");
import wrench = require ("wrench");

import InstallerBase = require ("./installerBase");
import installerProtocol = require ("../installerProtocol");
import installerUtils = require ("../utils/installerUtils");
import resources = require ("../resources/resourceManager");

import installerDataType = installerProtocol.DataType;

class AndroidSdkInstaller extends InstallerBase {
    private installerArchive: string;

    constructor(installerInfo: DependencyInstallerInterfaces.IInstallerData, softwareVersion: string, installTo: string, socketHandle: NodeJSNet.Socket) {
        super(installerInfo, softwareVersion, installTo, socketHandle);
    }

    // Override runWin32() method because we need a post-install configuration step
    protected runWin32(): Q.Promise<any> {
        var self = this;

        // Log progress
        installerUtils.sendData(this.socketHandle, installerDataType.Output, resources.getString("DownloadingLabel"));

        return this.downloadWin32()
            .then(function (): void {
                // Log progress
                installerUtils.sendData(self.socketHandle, installerDataType.Output, resources.getString("InstallingLabel"));
            })
            .then(this.installWin32.bind(this))
            .then(function (): void {
                // Log progress
                installerUtils.sendData(self.socketHandle, installerDataType.Output, resources.getString("SettingSystemVariablesLabel"));
            })
            .then(this.updateVariablesWin32.bind(this))
            .then(function (androidHomeValue: string): string {
                // Log progress
                installerUtils.sendData(self.socketHandle, installerDataType.Output, resources.getString("ConfiguringLabel"));

                // Return android home for the post-install setup
                return androidHomeValue;
            })
            .then(this.postInstallSetup.bind(this))
            .then(function (): void {
                // Log progress
                installerUtils.sendData(self.socketHandle, installerDataType.Success, resources.getString("Success"));
            });
    }

    protected downloadWin32(): Q.Promise<any> {
        // Set archive download path
        this.installerArchive = path.join(InstallerBase.InstallerCache, "androidSdk", this.softwareVersion, path.basename(this.installerInfo.installSource));

        // Prepare expected archive file properties
        var expectedProperties: installerUtils.IExpectedProperties = {
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

    protected installWin32(): Q.Promise<any> {
        // Extract the archive
        var templateZip = new admZip(this.installerArchive);

        if (!fs.existsSync(this.installDestination)) {
            wrench.mkdirSyncRecursive(this.installDestination, 511); // 511 decimal is 0777 octal
        }

        templateZip.extractAllTo(this.installDestination);

        return Q.resolve({});
    }

    protected updateVariablesWin32(): Q.Promise<string> {
        // Initialize values
        var androidHomeName: string = "ANDROID_HOME";
        var androidHomeValue: string = path.join(this.installDestination, "android-sdk-windows");
        var addToPathTools: string = path.join(androidHomeValue, "tools");
        var addToPathPlatformTools: string = path.join(androidHomeValue, "platform-tools");

        return installerUtils.setEnvironmentVariableIfNeededWin32(androidHomeName, androidHomeValue, this.socketHandle)
            .then(function (): Q.Promise<any> {
                return installerUtils.addToPathIfNeededWin32(addToPathTools);
            })
            .then(function (): Q.Promise<any> {
                return installerUtils.addToPathIfNeededWin32(addToPathPlatformTools);
            })
            .then(function (): Q.Promise<string> {
                // Because there is a post-install configuration step, we need to resolve this promise chain with the android home location
                return Q.resolve(androidHomeValue);
            });
    }

    private postInstallSetup(androidHome: string): Q.Promise<any> {
        // Install Android packages
        var deferred: Q.Deferred<any> = Q.defer<any>();
        var command: string = path.join(androidHome, "tools", "android.bat");
        var androidPackages: string[] = [
            "tools",
            "platform-tools",
            "extra-android-support",
            "extra-android-m2repository",
            "build-tools-19.1.0",
            "build-tools-21.1.2",
            "android-19",
            "android-21",
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
                cp.stdin.write("y\n");
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