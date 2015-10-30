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

"use strict";

import AdmZip = require ("adm-zip");
import childProcess = require ("child_process");
import fs = require ("fs");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import request = require ("request");
import util = require ("util");
import wrench = require ("wrench");

import InstallerBase = require ("./installerBase");
import installerProtocol = require ("../elevatedInstallerProtocol");
import installerUtils = require ("../utils/installerUtils");
import installerUtilsWin32 = require ("../utils/win32/installerUtilsWin32");
import resources = require ("../resources/resourceManager");
import tacoUtils = require ("taco-utils");

import ILogger = installerProtocol.ILogger;
import utilHelper = tacoUtils.UtilHelper;

class AndroidSdkInstaller extends InstallerBase {
    private static ANDROID_HOME_NAME: string = "ANDROID_HOME";
    private static androidCommand: string = os.platform() === "win32" ? "android.bat" : "android";

    private installerArchive: string;
    private androidHomeValue: string;

    constructor(installerInfo: DependencyInstallerInterfaces.IInstallerData, softwareVersion: string, installTo: string, logger: ILogger, steps: DependencyInstallerInterfaces.IStepsDeclaration) {
        super(installerInfo, softwareVersion, installTo, logger, steps, "androidSdk");
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

        return installerUtilsWin32.setEnvironmentVariableIfNeededWin32(AndroidSdkInstaller.ANDROID_HOME_NAME, androidHomeValue, this.logger)
            .then(function (): Q.Promise<any> {
                return installerUtilsWin32.addToPathIfNeededWin32([addToPathTools, addToPathPlatformTools]);
            });
    }

    protected downloadDarwin(): Q.Promise<any> {
        return this.downloadDefault();
    }

    protected installDarwin(): Q.Promise<any> {
        var self: AndroidSdkInstaller = this;

        // Before we extract Android SDK, we need to save the first directory under the specified install path that doesn't exist. This directory and all those under it will be created
        // with root as the owner, so we will need to change the owner back to the current user after the extraction is complete.
        var pathSegments: string[] = path.resolve(this.installDestination).split(os.EOL);
        var firstNonExistentDir: string;
        var pathSoFar: string = "";

        pathSegments.some(function (dir: string): boolean {
            pathSoFar = path.join(pathSoFar, dir);

            if (!fs.existsSync(pathSoFar)) {
                firstNonExistentDir = pathSoFar;

                return true;
            }

            return false;
        });

        return this.installDefault()
            .then(function (): void {
                // If some segments of the path the SDK was extracted to didn't exist before, it means they were created as part of the install. They will have root as the owner, so we 
                // must change the owner back to the current user.
                if (firstNonExistentDir) {
                    wrench.chownSyncRecursive(firstNonExistentDir, parseInt(tacoUtils.ProcessUtils.getProcess().env.SUDO_UID, 10), parseInt(tacoUtils.ProcessUtils.getProcess().env.SUDO_GID, 10));
                }
            });
    }

    protected updateVariablesDarwin(): Q.Promise<any> {
        var deferred: Q.Deferred<any> = Q.defer<any>();

        // Initialize values
        var androidHomeValue: string = path.join(this.installDestination, "android-sdk-macosx");
        var fullPathTools: string = path.join(androidHomeValue, "tools/");
        var fullPathPlatformTools: string = path.join(androidHomeValue, "platform-tools/");
        var shortPathTools: string = util.format("$%s%stools", AndroidSdkInstaller.ANDROID_HOME_NAME, path.sep);
        var shortPathPlatformTools: string = util.format("$%s%splatform-tools", AndroidSdkInstaller.ANDROID_HOME_NAME, path.sep);
        var addToPath: string = "";
        var exportPathLine: string = "";
        var exportAndroidHomeLine: string = "";
        var updateCommand: string = "";
        var useShortPaths: boolean = true;

        // Save Android home value
        this.androidHomeValue = androidHomeValue;

        // Check if we need to add an ANDROID_HOME value
        if (!tacoUtils.ProcessUtils.getProcess().env[AndroidSdkInstaller.ANDROID_HOME_NAME]) {
            exportAndroidHomeLine = util.format("%sexport %s=\"%s\"", os.EOL, AndroidSdkInstaller.ANDROID_HOME_NAME, androidHomeValue);

            // Modify the value of ANDROID_HOME for the running process
            process.env[AndroidSdkInstaller.ANDROID_HOME_NAME] = this.androidHomeValue;
        } else {
            var existingSdkHome: string = tacoUtils.ProcessUtils.getProcess().env[AndroidSdkInstaller.ANDROID_HOME_NAME];

            // Process the existing ANDROID_HOME to resolve to an absolute path, including processing ~ notation and environment variables
            existingSdkHome = path.resolve(utilHelper.expandEnvironmentVariables(existingSdkHome));

            if (existingSdkHome !== androidHomeValue) {
                // A conflicting ANDROID_HOME already exists, warn the user, but don't add our own ANDROID_HOME
                this.logger.logWarning(resources.getString("SystemVariableExistsDarwin", AndroidSdkInstaller.ANDROID_HOME_NAME, this.androidHomeValue));
                useShortPaths = false;
            }
        }

        // Check if we need to update PATH
        if (!installerUtils.pathContains(fullPathTools)) {
            addToPath += path.delimiter + (useShortPaths ? shortPathTools : fullPathTools);

            // Modify the value of PATH for the running process
            process.env["PATH"] += path.delimiter + fullPathTools;
        }

        if (!installerUtils.pathContains(fullPathPlatformTools)) {
            addToPath += path.delimiter + (useShortPaths ? shortPathPlatformTools : fullPathPlatformTools);

            // Modify the value of PATH for the running process
            process.env["PATH"] += path.delimiter + fullPathPlatformTools;
        }

        if (addToPath) {
            exportPathLine = util.format("%sexport PATH=\"$PATH%s\"", os.EOL, addToPath);
        }

        // Check if we need to update .bash_profile
        var bashProfilePath: string = path.join(tacoUtils.ProcessUtils.getProcess().env.HOME, ".bash_profile");
        var mustChown: boolean = !fs.existsSync(bashProfilePath);

        if (exportAndroidHomeLine || exportPathLine) {
            updateCommand = util.format("echo '%s# Android SDK%s%s' >> '%s'", os.EOL, exportAndroidHomeLine, exportPathLine, bashProfilePath);
        }

        // Perform the update if necessary
        if (updateCommand) {
            childProcess.exec(updateCommand, (error: Error, stdout: Buffer, stderr: Buffer) => {
                if (error) {
                    this.telemetry
                        .add("error.description", "ErrorOnChildProcess on updateVariablesDarwin", /*isPii*/ false)
                        .addError(error);
                    deferred.reject(error);
                } else {
                    // If .bash_profile didn't exist before, make sure the owner is the current user, not root
                    if (mustChown) {
                        fs.chownSync(bashProfilePath, parseInt(tacoUtils.ProcessUtils.getProcess().env.SUDO_UID, 10), parseInt(tacoUtils.ProcessUtils.getProcess().env.SUDO_GID, 10));
                    }

                    deferred.resolve({});
                }
            });
        } else {
            deferred.resolve({});
        }

        return deferred.promise;
    }

    protected postInstallDarwin(): Q.Promise<any> {
        var self: AndroidSdkInstaller = this;

        // We need to add execute permission to the android executable in order to run it
        return this.addExecutePermission(path.join(this.androidHomeValue, "tools", "android"))
            .then(function (): Q.Promise<any> {
                // We need to add execute permissions for the Gradle wrapper in order to build Android projects
                return self.addExecutePermission(path.join(self.androidHomeValue, "tools", "templates", "gradle", "wrapper", "gradlew"));
            });
    }

    private downloadDefault(): Q.Promise<any> {
        this.installerArchive = path.join(InstallerBase.installerCache, "androidSdk", os.platform(), this.softwareVersion, path.basename(this.installerInfo.installSource));

        // Prepare expected archive file properties
        var expectedProperties: installerUtils.IFileSignature = {
            bytes: this.installerInfo.bytes,
            sha1: this.installerInfo.sha1
        };

        // Prepare download options
        var options: request.Options = {
            uri: this.installerInfo.installSource,
            method: "GET"
        };

        // Download the archive
        return installerUtils.downloadFile(options, this.installerArchive, expectedProperties);
    }

    private installDefault(): Q.Promise<any> {
        // Make sure we have an install location
        if (!this.installDestination) {
            this.telemetry.add("error.description", "NeedInstallDestination on installDefault", /*isPii*/ false);
            return Q.reject(new Error(resources.getString("NeedInstallDestination")));
        }

        // Extract the archive
        var templateZip: AdmZip = new AdmZip(this.installerArchive);

        if (!fs.existsSync(this.installDestination)) {
            wrench.mkdirSyncRecursive(this.installDestination, 511); // 511 decimal is 0777 octal
        }

        templateZip.extractAllTo(this.installDestination);

        return Q.resolve({});
    }

    private addExecutePermission(fileFullPath: string): Q.Promise<any> {
        var deferred: Q.Deferred<any> = Q.defer<any>();
        var command: string = util.format("chmod a+x \"%s\"", fileFullPath);

        childProcess.exec(command, (error: Error, stdout: Buffer, stderr: Buffer) => {
            if (error) {
                this.telemetry
                    .add("error.description", "ErrorOnChildProcess on addExecutePermission", /*isPii*/ false)
                    .addError(error);
                deferred.reject(error);
            } else {
                deferred.resolve({});
            }
        });

        return deferred.promise;
    }
}

export = AndroidSdkInstaller;
