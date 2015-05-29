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

"use strict";

import fs = require ("fs");
import net = require ("net");
import path = require ("path");
import Q = require ("q");
import sanitizeFilename = require ("sanitize-filename");

import DependencyDataWrapper = require ("./utils/dependencyDataWrapper");
import InstallerBase = require ("./installers/installerBase");
import installerUtils = require ("./utils/installerUtils");
import protocol = require ("./installerProtocol");
import resources = require ("./resources/resourceManager");

interface IDependencyWrapper {
    dependency: DependencyInstallerInterfaces.IDependency;
    installer: InstallerBase;
}

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
    private socketPath: string;
    private socketHandle: NodeJSNet.Socket;
    private configFile: string;

    constructor() {
        this.errorFlag = false;
        this.dependenciesDataWrapper = new DependencyDataWrapper();
        this.socketPath = process.argv[2];
        this.configFile = process.argv[3];
    }

    public run(): void {
        this.connectToServer()
            .then(this.parseInstallConfig.bind(this))
            .then(this.runInstallers.bind(this))
            .catch(this.errorHandler.bind(this))
            .then(this.exitProcess.bind(this));
    }

    private connectToServer(): Q.Promise<any> {
        if (!this.socketPath) {
            // If we can't connect to the DependencyInstaller's server, the only way to let the DependencyInstaller know is via exit code
            process.exit(protocol.ExitCode.CouldNotConnect);
        }

        var deferred: Q.Deferred<any> = Q.defer<any>();
        try {
            this.socketHandle = net.connect(this.socketPath, function (): void {
                deferred.resolve({});
            });
        } catch (err) {
            // If we can't connect to the DependencyInstaller's server, the only way to let the DependencyInstaller know is via exit code
            process.exit(protocol.ExitCode.CouldNotConnect);
        }

        return deferred.promise;
    }

    private parseInstallConfig(): void {
        var self = this;
        var parsedData: DependencyInstallerInterfaces.IInstallerConfig = null;

        if (!fs.existsSync(this.configFile)) {
            throw new Error(resources.getString("InstallConfigNotFound", this.configFile));
        }

        try {
            parsedData = require(this.configFile);
        } catch (err) {
            throw new Error(resources.getString("InstallConfigMalformed"));
        }

        this.missingDependencies = [];
        parsedData.dependencies.forEach(function (value: DependencyInstallerInterfaces.IDependency): void {
            // Verify the dependency id exists
            if (!self.dependenciesDataWrapper.dependencyExists(value.id)) {
                throw new Error(resources.getString("UnknownDependency", value.id));
            }

            // Verify the version exists for the dependency
            if (!self.dependenciesDataWrapper.versionExists(value.id, value.version)) {
                throw new Error(resources.getString("UnknownVersion", value.id, value.version));
            }

            // Verify the path is valid
            path.resolve(value.installDestination).split(path.sep).forEach(function (dirName: string, index: number): void {
                var shouldThrow: boolean = false;

                if (index === 0 && /^[a-zA-Z]:$/.test(dirName)) {
                    // If the first segment is a drive letter, verify that the drive exists
                    if (!fs.existsSync(dirName)) {
                        shouldThrow = true;
                    }
                } else if (sanitizeFilename(dirName) !== dirName) {
                    // The current path segment is not a valid directory name
                    shouldThrow = true;
                }

                if (shouldThrow) {
                    throw new Error(resources.getString("InvalidInstallPath", value.id, value.installDestination));
                }
            });

            // Verify the path is empty if it exists
            if (fs.existsSync(value.installDestination)) {
                if (fs.readdirSync(value.installDestination).length > 0) {
                    throw new Error(resources.getString("PathNotEmpty", value.id, value.installDestination));
                }
            }

            // At this point, the values appear valid, so proceed with the instantiation of the installer for this dependency
            var dependencyWrapper: IDependencyWrapper = {
                dependency: value,
                installer: self.instantiateInstaller(value)
            };

            // Add the dependency to our list of dependencies to install
            self.missingDependencies.push(dependencyWrapper);
        });
    }

    private instantiateInstaller(dependency: DependencyInstallerInterfaces.IDependency): any {
        var installerInfoToUse: DependencyInstallerInterfaces.IInstallerData = this.dependenciesDataWrapper.getInstallerInfo(dependency.id, dependency.version);
        var installerConstructor: any = require(ElevatedInstaller.InstallerMap[dependency.id]);

        return new installerConstructor(installerInfoToUse, dependency.version, dependency.installDestination, this.socketHandle);
    }

    private runInstallers(): Q.Promise<any> {
        var self = this;

        return this.missingDependencies.reduce(function (previous: Q.Promise<any>, value: IDependencyWrapper): Q.Promise<any> {
            return previous
                .then(function (): Q.Promise<any> {
                    installerUtils.sendData(self.socketHandle, protocol.DataType.Bold, value.dependency.displayName);

                    return value.installer.run();
                })
                .then(function (): void {
                    installerUtils.sendData(self.socketHandle, protocol.DataType.Success, resources.getString("Success"));
                })
                .catch(self.errorHandler.bind(self));
        }, Q({}));
    }

    private errorHandler(err: Error): void {
        this.errorFlag = true;
        installerUtils.sendData(this.socketHandle, protocol.DataType.Error, err.message);
    }

    private exitProcess(): void {
        this.socketHandle.end();

        if (this.errorFlag) {
            process.exit(protocol.ExitCode.CompletedWithErrors);
        } else {
            process.exit(protocol.ExitCode.Success);
        }
    }
}

var elevatedInstaller: ElevatedInstaller = new ElevatedInstaller();

elevatedInstaller.run();