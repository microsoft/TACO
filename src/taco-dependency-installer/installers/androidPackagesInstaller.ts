/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/dependencyInstallerInterfaces.d.ts" />
/// <reference path="../../typings/Q.d.ts" />

"use strict";

import childProcess = require ("child_process");
import fs = require ("fs");
import os = require ("os");
import path = require ("path");
import Q = require ("q");

import InstallerBase = require ("./installerBase");
import installerProtocol = require ("../elevatedInstallerProtocol");
import installerUtils = require ("../utils/installerUtils");
import installerUtilsWin32 = require ("../utils/win32/installerUtilsWin32");
import resources = require ("../resources/resourceManager");
import tacoUtils = require ("taco-utils");

import ILogger = installerProtocol.ILogger;
import utilHelper = tacoUtils.UtilHelper;

class AndroidPackagesInstaller extends InstallerBase {
    private static ANDROID_HOME_NAME: string = "ANDROID_HOME";
    private static PLATFORM_TOOLS_PKG: string = "platform-tools";
    private static BUILD_TOOLS_PKG_PREFIX: string = "build-tools-";

    private androidHomeValue: string;
    private androidCommand: string;
    private adbCommand: string;
    private availablePackages: string[];

    private static getAndroidTargetPackageId(): Q.Promise<string> {
        // Read the Android project properties
        // Find the value at the "target=" line
        // Ensure the extracted value is available in the package list
    }

    constructor(installerInfo: DependencyInstallerInterfaces.IInstallerData, softwareVersion: string, installTo: string, logger: ILogger, steps: DependencyInstallerInterfaces.IStepsDeclaration) {
        super(installerInfo, softwareVersion, installTo, logger, steps, "androidPackages");
    }

    protected installWin32(): Q.Promise<any> {
        return this.installDefault();
    }

    protected installDarwin(): Q.Promise<any> {
        return this.installDefault();
    }

    private buildAndroidCommands(): void {
        // Read the ANDROID_HOME from the process
        var androidHomeValue: string = process.env[AndroidPackagesInstaller.ANDROID_HOME_NAME];

        if (androidHomeValue) {
            // ANDROID_HOME is set, use that to find the android executable
            this.androidHomeValue = utilHelper.expandEnvironmentVariables(androidHomeValue);

            // Build the android and adb commands and save them in members for reusability
            var androidExecutable: string = os.platform() === "win32" ? "android.bat" : "android";
            var adbExecutable: string = os.platform() === "win32" ? "adb.exe" : "adb";

            this.androidCommand = path.join(this.androidHomeValue, "tools", androidExecutable);
            this.androidCommand = path.join(this.androidHomeValue, "platform-tools", adbExecutable);
        } else {
            // ANDROID_HOME is not set, but the android and adb executables might still be in the PATH
            this.androidHomeValue = "";
            this.androidCommand = "android";
            this.adbCommand = "adb";
        }
    }

    private getAvailableAndroidPackages(): Q.Promise<any> {
        var deferred: Q.Deferred<any> = Q.defer();

        // Call "android list sdk -e" and capture output
        var args: string[] = [
            "list",
            "sdk",
            "-e"
        ];
        var output: string = "";
        var errorOutput: string = "";
        var cp: childProcess.ChildProcess = os.platform() === "darwin" ?
            childProcess.spawn(this.androidCommand, args, { uid: parseInt(process.env.SUDO_UID, 10), gid: parseInt(process.env.SUDO_GID, 10) }) : childProcess.spawn(this.androidCommand, args);

        cp.stdout.on("data", function (data: Buffer): void {
            output += data.toString();
        });
        cp.on("error", (err: Error) => {
            asd
            this.telemetry
                .add("error.description", "ErrorOnChildProcess on installAndroidPackages", /*isPii*/ false)
                .addError(err);
            deferred.reject(err);
        });
        cp.on("exit", (code: number) => {
            if (errorOutput) {
                this.telemetry
                    .add("error.description", "ErrorOnExitOfChildProcess on installAndroidPackages", /*isPii*/ false)
                    .add("error.code", code, /*isPii*/ false)
                    .add("error.message", errorOutput, /*isPii*/ true);
                deferred.reject(new Error(errorOutput));
            } else {
                // Parse for package ids and save them

                fdsfds

                deferred.resolve({});
            }
        });

        return deferred.promise;
    }

    private getPlatformToolsPackageId(): string {
        // Look in the list of available packages for the platform-tools package
        var packageIdIndex: number = this.availablePackages.indexOf(AndroidPackagesInstaller.PLATFORM_TOOLS_PKG);

        // If none is found, it means the latest platform tools are already installed, so just return an empty string; otherwise return the full ID
        return packageIdIndex === -1 ? "" : this.availablePackages[packageIdIndex];
    }

    private getBuildToolsPackageId(): string {
        // Look in the list of available packages for one that starts with the build-tools prefix
        var packageId: string = "";

        this.availablePackages.some(function (pkg: string): boolean {
            if (pkg.indexOf(AndroidPackagesInstaller.BUILD_TOOLS_PKG_PREFIX) === 0) {
                packageId = pkg;

                return true;
            }

            return false;
        });

        // If none is found, it means the latest build tools are already installed, so just return an empty string; otherwise return the full ID
        return packageId;
    }

    private installDefault(): Q.Promise<any> {
        var self: AndroidPackagesInstaller = this;

        this.buildAndroidCommands();

        return Q({})
            .then(function (): void {
                // Read available packages and save them in a member
                self.getAvailableAndroidPackages();
            })
            .then(function (): Q.Promise<string> {
                // Get the android-target package to install
                return AndroidPackagesInstaller.getAndroidTargetPackageId();
            })
            .then(function (androidTargetPackage: string): Q.Promise<any> {
                var packagesToInstall: string[] = [];

                // Get the build-tools package to install
                var platformToolsPackage: string = self.getPlatformToolsPackageId();

                if (platformToolsPackage) {
                    packagesToInstall.push(platformToolsPackage);
                }

                // Get the build-tools package to install
                var buildToolsPackage: string = self.getBuildToolsPackageId();

                if (buildToolsPackage) {
                    packagesToInstall.push(buildToolsPackage);
                }

                // Add the android target package to the list
                packagesToInstall.push(androidTargetPackage);

                // Build the list of packages to install
                var packagesFilter: string = packagesToInstall.join(",");

                // Invoke the update command
                return self.installAndroidPackages(packagesFilter);
            })
            .then(function (): Q.Promise<any> {
                // Kill the adb server
                return self.killAdb();
            });
    }

    private installAndroidPackages(packagesFilter: string): Q.Promise<any> {
        // Install Android packages
        var deferred: Q.Deferred<any> = Q.defer<any>();
        var args: string[] = [
            "update",
            "sdk",
            "-u",
            "--filter",
            packagesFilter
        ];
        var errorOutput: string = "";
        var cp: childProcess.ChildProcess = os.platform() === "darwin" ?
            childProcess.spawn(this.androidCommand, args, { uid: parseInt(process.env.SUDO_UID, 10), gid: parseInt(process.env.SUDO_GID, 10) }) : childProcess.spawn(this.androidCommand, args);

        cp.stdout.on("data", function (data: Buffer): void {
            var stringData: string = data.toString();

            if (/\[y\/n\]:/.test(stringData)) {
                // Accept license terms
                cp.stdin.write("y" + os.EOL);
                cp.stdin.end();
            }
        });
        cp.stderr.on("data", function (data: Buffer): void {
            errorOutput += data.toString();
        });
        cp.on("error", (err: Error) => {
            asd
            this.telemetry
                .add("error.description", "ErrorOnChildProcess on installAndroidPackages", /*isPii*/ false)
                .addError(err);
            deferred.reject(err);
        });
        cp.on("exit", (code: number) => {
            if (errorOutput) {
                this.telemetry
                    .add("error.description", "ErrorOnExitOfChildProcess on installAndroidPackages", /*isPii*/ false)
                    .add("error.code", code, /*isPii*/ false)
                    .add("error.message", errorOutput, /*isPii*/ true);
                deferred.reject(new Error(errorOutput));
            } else {
                deferred.resolve({});
            }
        });

        return deferred.promise;
    }

    private killAdb(): Q.Promise<any> {
        // Kill stray adb processes - this is an important step
        // as stray adb processes spawned by the android installer
        // can result in a hang post installation
        var deferred: Q.Deferred<any> = Q.defer<any>();

        var adbProcess: childProcess.ChildProcess = childProcess.spawn(this.adbCommand, ["kill-server"]);
        adbProcess.on("error", (error: Error) => {
            asd
            this.telemetry
                .add("error.description", "ErrorOnKillingAdb in killAdb", /*isPii*/ false)
                .addError(error);
            deferred.reject(error);
        });

        adbProcess.on("exit", function (code: number): void {
            deferred.resolve({});
        });

        return deferred.promise;
    }
}

export = AndroidPackagesInstaller;
