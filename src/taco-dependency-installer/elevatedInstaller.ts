/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/dependencyInstallerInterfaces.d.ts" />
/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/sanitize-filename.d.ts" />
/// <reference path="../typings/tacoUtils.d.ts" />

"use strict";

import fs = require ("fs");
import nodeWindows = require ("node-windows");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import sanitizeFilename = require ("sanitize-filename");

import DependencyDataWrapper = require ("./utils/dependencyDataWrapper");
import InstallerBase = require ("./installers/installerBase");
import installerUtils = require ("./utils/installerUtils");
import resources = require ("./resources/resourceManager");
import tacoUtils = require ("taco-utils");

import logger = tacoUtils.Logger;

interface IDependencyWrapper {
    dependency: DependencyInstallerInterfaces.IDependency;
    installer: InstallerBase;
}

// TEMP TEMP TEMP TEMP TEMP
var verbose = true;
var verboseLevel = 5;
function logVerbose(message: string, level: number = verboseLevel): void {
    if (!verbose || level > verboseLevel) {
        return;
    }

    logger.logLinkLine(message);
}
// /TEMP TEMP TEMP TEMP TEMP

logVerbose("Entered elevatedInstaller", 1);
logVerbose("process.argv: " + process.argv, 3);
var installer: ElevatedInstaller = new ElevatedInstaller();
installer.run();

class ElevatedInstaller {
    // Map the dependency ids to their installer class path
    private static InstallerMap: { [dependencyId: string]: string } = {
        androidSdk: "./installers/androidSdkInstaller",
        ant: "./installers/antInstaller",
        gradle: "./installers/gradleInstaller",
        iosDeploy: "./installers/iosDeployInstaller",
        iosSim: "./installers/iosSimInstaller",
        javaJdk: "./installers/javaJdkInstaller",
        msBuild: "./installers/msBuildInstaller"
    };

    private dependenciesDataWrapper: DependencyDataWrapper;
    private missingDependencies: IDependencyWrapper[];
    private errorFlag: boolean;

    constructor() {
        logVerbose("Entered elevatedInstaller constructor...", 3);
        this.errorFlag = false;
    }

    public run(): void {
        logVerbose("Started running the elevated installer", 1);
        this.verifyAdminRights()
            .then(this.instantiateDataWrapper.bind(this))
            .then(this.parseInstallConfig.bind(this))
            .then(this.runInstallers.bind(this))
            .catch(this.errorHandler.bind(this))
            .then(this.exitProcess.bind(this));
    }

    private verifyAdminRights(): Q.Promise<any> {
        logVerbose("Verifying administrator privileges...", 2);
        var deferred: Q.Deferred<any> = Q.defer<any>();

        nodeWindows.isAdminUser(function (isAdmin: boolean): void {
            if (isAdmin) {
                logVerbose("   ...Success! Process has administrator privileges", 4);
                deferred.resolve({});
            } else {
                logVerbose("   ...Error: Process does not have administrator privileges", 4);
                deferred.reject(new Error(resources.getString("NoAdminRights")));
            }
        });

        return deferred.promise;
    }

    private instantiateDataWrapper(): void {
        logVerbose("Creating the wrapper for the dependencies metadata...", 2);
        this.dependenciesDataWrapper = new DependencyDataWrapper();
    }

    private parseInstallConfig(): void {
        logVerbose("Parsing installConfig.json...", 2);
        var self = this;
        var configFile: string = process.argv[2];
        logVerbose("installConfig.json path received: " + configFile, 4);
        var parsedData: DependencyInstallerInterfaces.IInstallerConfig = null;

        if (!fs.existsSync(configFile)) {
            logVerbose("   ...Error: installConfig.json not found", 4);
            throw new Error(resources.getString("InstallConfigNotFound", configFile));
        }

        logVerbose("   ...Success! installConfig.json found, parsing...", 4);
        try {
            parsedData = require(configFile);
        } catch (err) {
            logVerbose("   ...Error: Unable to parse installConfig.json", 4);
            throw new Error(resources.getString("InstallConfigMalformed"));
        }

        logVerbose("   ...Success! Parsed installConfig.json successfully, building missing dependencies array...", 4);
        this.missingDependencies = [];
        parsedData.dependencies.forEach(function (value: DependencyInstallerInterfaces.IDependency): void {
            logVerbose("      ...Dependency received: " + value.id, 5);
            // Validate the information in the installation configuration file
            if (!self.dependenciesDataWrapper.dependencyExists(value.id)) {
                logVerbose("      ...Error: Unknown dependency received: " + value.id, 5);
                throw new Error(resources.getString("UnkownDependency", value.id));
            }

            if (!self.dependenciesDataWrapper.versionExists(value.id, value.version)) {
                logVerbose("      ...Error: Unknown version for the dependency: " + value.version, 5);
                throw new Error(resources.getString("UnkownVersion", value.id, value.version));
            }

            path.resolve(value.installDestination).split(path.sep).forEach(function (dirName: string): void {
                if (sanitizeFilename(dirName) !== dirName) {
                    logVerbose("      ...Error: Invalid installation path: " + value.installDestination, 5);
                    throw new Error(resources.getString("InvalidInstallPath", value.id, value.installDestination));
                }
            });

            // At this point, the values appear valid, so proceed with the instantiation of the installer for this dependency
            logVerbose("      ...Adding dependency to our array...", 5);
            var dependencyWrapper: IDependencyWrapper = {
                dependency: value,
                installer: self.instantiateInstaller(value)
            };

            // Add the dependency to our list of dependencies to install
            self.missingDependencies.push(dependencyWrapper);
            logVerbose("      ...Success! Dependency successfully registered", 5);
        });
        logVerbose("   ...Success! All dependencies registered to our array", 4);
    }

    private instantiateInstaller(dependency: DependencyInstallerInterfaces.IDependency): any {
        logVerbose("   ...Instantiating the installer for the dependency...", 5);
        var installerInfoToUse: DependencyInstallerInterfaces.IInstallerData = this.dependenciesDataWrapper.getInstallerInfo(dependency.id, dependency.version);
        var installerConstructor: any = require(ElevatedInstaller.InstallerMap[dependency.id]);

        return new installerConstructor(installerInfoToUse, dependency.version, dependency.installDestination);
    }

    private runInstallers(): Q.Promise<any> {
        logVerbose("Running installers...", 2);
        var self = this;

        return this.missingDependencies.reduce(function (previous: Q.Promise<any>, value: IDependencyWrapper): Q.Promise<any> {
            logVerbose("   ...Chaining installer for dependency: " + value.dependency.id, 5);
            return previous
                .then(function (): Q.Promise<any> {
                    logger.logNormalBoldLine(value.dependency.displayName);

                    logVerbose("   ...Running installer for dependency: " + value.dependency.id, 5);
                    return value.installer.run();
                })
                .catch(self.errorHandler.bind(self))
                .then(function (): void {
                    logVerbose("   ...Done running installer for dependency: " + value.dependency.id, 5);
                    logger.log("\n");
                });
        }, Q({}));
    }

    private errorHandler(err: Error): void {
        logVerbose("errorHandler has been called", 4);
        this.errorFlag = true;
        logger.logErrorLine(err.message);
    }

    private exitProcess(): void {
        logVerbose("Exiting elevated installer...", 1);
        if (this.errorFlag) {
            logVerbose("...Exiting with exit code 1", 1);
            process.exit(1);
        } else {
            logVerbose("...Exiting normally", 1);
            process.exit();
        }
    }
}