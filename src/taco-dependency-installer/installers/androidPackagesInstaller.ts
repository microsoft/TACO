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
import util = require ("util");

import InstallerBase = require ("./installerBase");
import installerProtocol = require ("../elevatedInstallerProtocol");
import resources = require ("../resources/resourceManager");
import tacoUtils = require ("taco-utils");

import ILogger = installerProtocol.ILogger;
import utilHelper = tacoUtils.UtilHelper;

class AndroidPackagesInstaller extends InstallerBase {
    private static ANDROID_HOME_NAME: string = "ANDROID_HOME";
    private static PLATFORM_TOOLS_PKG: string = "platform-tools";
    private static BUILD_TOOLS_PKG_PREFIX: string = "build-tools-";

    private androidCommand: string;
    private adbCommand: string;
    private availablePackages: string[];

    private static removeOptionsFromStderr(stderr: string): string {
        // For some reason, Android SDK outputs the java options specified in _JAVA_OPTIONS env variable to stderr when it picks them up. This means TACO detects an error in the SDK command,
        // when in reality everything went fine. Here, we filter out such lines from the error output.
        return stderr.split(os.EOL).filter(function (line: string): boolean {
            // Return true to keep a line; we keep it if it doesn't start with "Picked up "
            return line.indexOf("Picked up ") === -1;
        }).join(os.EOL);
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
            androidHomeValue = utilHelper.expandEnvironmentVariables(androidHomeValue);

            // Build the android and adb commands and save them in members for reusability
            var androidExecutable: string = os.platform() === "win32" ? "android.bat" : "android";
            var adbExecutable: string = os.platform() === "win32" ? "adb.exe" : "adb";

            this.androidCommand = path.join(androidHomeValue, "tools", androidExecutable);
            this.adbCommand = path.join(androidHomeValue, "platform-tools", adbExecutable);
        } else {
            // ANDROID_HOME is not set, but the android and adb executables might still be in the PATH
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
        cp.on("error", (err: any) => {
            this.telemetry
                .add("error.description", "ErrorOnChildProcess on installAndroidPackages", /*isPii*/ false)
                .addError(err);

            if (err.code === "ENOENT") {
                deferred.reject(new Error(resources.getString("AndroidCommandNotFound", path.basename(this.androidCommand))));
            } else {
                deferred.reject(err);
            }
        });
        cp.on("exit", (code: number) => {
            errorOutput = AndroidPackagesInstaller.removeOptionsFromStderr(errorOutput);

            if (errorOutput || code) {
                this.telemetry
                    .add("error.description", "ErrorOnExitOfChildProcess on installAndroidPackages", /*isPii*/ false)
                    .add("error.code", code, /*isPii*/ false)
                    .add("error.message", errorOutput, /*isPii*/ true);

                var errorString: string = errorOutput || resources.getString("InstallerExitCode", util.format("%s %s", this.androidCommand, args.join(" ")), code);

                deferred.reject(new Error(errorString));
            } else {
                this.availablePackages = [];

                // Parse for package ids and save them
                var regex: RegExp = /id: \d+ or "(.+)"/g;
                var match: RegExpMatchArray = regex.exec(output);

                while (match) {
                    this.availablePackages.push(match[1]);  // Index 0 is the entire matched line, index 1 is the captured group which is the actual package ID
                    match = regex.exec(output);
                }

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

    private getAndroidTargetPackageId(): string {
        // Read the Android project properties
        var projectPropertiesPath: string = path.join("platforms", "android", "project.properties");
        var fileContent: string = fs.readFileSync(projectPropertiesPath).toString();

        // Find the value at the "target=" line
        var androidTargetId: string = /target=(.+)/.exec(fileContent)[1];

        // Make sure the android target is in the list of available packages, otherwise it is an error state
        if (this.availablePackages.indexOf(androidTargetId) === -1) {
            throw new Error(resources.getString("UnknownAndroidTarget", androidTargetId, projectPropertiesPath));
        }

        return androidTargetId;
    }

    private installDefault(): Q.Promise<any> {
        var self: AndroidPackagesInstaller = this;

        this.buildAndroidCommands();

        return Q({})
            .then(function (): Q.Promise<any> {
                // Read available packages and save them in a member
                return self.getAvailableAndroidPackages();
            })
            .then(function (): Q.Promise<any> {
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

                // Get the android target package to install
                try {
                    var androidTargetPackage: string = self.getAndroidTargetPackageId();

                    if (androidTargetPackage) {
                        packagesToInstall.push(androidTargetPackage);
                    }
                } catch (err) {
                    // An error will occur if the Android target is unknown
                    return Q.reject(err);
                }

                // Build the list of packages to install
                var packagesFilter: string = packagesToInstall.join(",");

                // Invoke the update command
                return self.installAndroidPackages(packagesFilter)
                    .then(function (): Q.Promise<any> {
                        // Kill the adb server
                        return self.killAdb();
                    });
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
        cp.on("error", (err: any) => {
            this.telemetry
                .add("error.description", "ErrorOnChildProcess on installAndroidPackages", /*isPii*/ false)
                .addError(err);

            if (err.code === "ENOENT") {
                deferred.reject(new Error(resources.getString("AndroidCommandNotFound", path.basename(this.androidCommand))));
            } else {
                deferred.reject(err);
            }
        });
        cp.on("exit", (code: number) => {
            errorOutput = AndroidPackagesInstaller.removeOptionsFromStderr(errorOutput);

            if (errorOutput || code) {
                this.telemetry
                    .add("error.description", "ErrorOnExitOfChildProcess on installAndroidPackages", /*isPii*/ false)
                    .add("error.code", code, /*isPii*/ false)
                    .add("error.message", errorOutput, /*isPii*/ true);

                var errorString: string = errorOutput || resources.getString("InstallerExitCode", util.format("%s %s", this.androidCommand, args.join(" ")), code);

                deferred.reject(new Error(errorString));
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

        adbProcess.on("error", (err: any) => {
            this.telemetry
                .add("error.description", "ErrorOnKillingAdb in killAdb", /*isPii*/ false)
                .addError(err);

            if (err.code === "ENOENT") {
                deferred.reject(new Error(resources.getString("AndroidCommandNotFound", "adb")));
            } else {
                deferred.reject(err);
            }
        });

        adbProcess.on("exit", function (code: number): void {
            deferred.resolve({});
        });

        return deferred.promise;
    }
}

export = AndroidPackagesInstaller;
