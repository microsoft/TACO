/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/dependencyInstallerInterfaces.d.ts" />
/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/tacoUtils.d.ts" />

"use strict";

import fs = require ("fs");
import path = require ("path");
import Q = require ("q");

import DependencyDataWrapper = require ("./utils/dependencyDataWrapper");
import InstallerBase = require ("./installers/installerBase");
import protocol = require ("./elevatedInstallerProtocol");
import resources = require ("./resources/resourceManager");
import tacoUtils = require ("taco-utils");

import ExitCode = protocol.ExitCode;
import ILogger = protocol.ILogger;
import utilHelper = tacoUtils.UtilHelper;

interface IDependencyWrapper {
    dependency: DependencyInstallerInterfaces.IDependency;
    installer: InstallerBase;
}

/*
 * Takes care of the actual installation work for the third-party dependencies (parsing and validating the config file, instantiating specialized installers, running installers).
 */
class InstallerRunner {
    private missingDependencies: IDependencyWrapper[];
    private dependenciesDataWrapper: DependencyDataWrapper;
    private installerErrorFlag: boolean;
    private configFile: string;
    private logger: ILogger;

    constructor(configFilePath: string, logger: ILogger, metadataFilePath?: string) {
        this.installerErrorFlag = false;
        this.dependenciesDataWrapper = metadataFilePath ? new DependencyDataWrapper(metadataFilePath) : new DependencyDataWrapper();
        this.configFile = configFilePath;
        this.logger = logger;
    }

    public run(): Q.Promise<number> {
        var self = this;

        return Q({})
            .then(function (): void {
                self.parseInstallConfig();
            })
            .then(function (): Q.Promise<any> {
                return self.runInstallers();
            })
            .then(function (): number {
                // If we reach this point, it means we ran the installers. Verify if there was an installation error and return appropriately.
                if (self.installerErrorFlag) {
                    return ExitCode.CompletedWithErrors;
                }

                return ExitCode.Success;
            })
            .catch(function (err: Error): number {
                // If we reach this point, it either means we had an unknown error or a config file validation error. Both cases have a return code of FatalError.
                self.logger.logError(err.message);

                return ExitCode.FatalError;
            });
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

        var installPaths: { path: string; displayName: string; }[] = [];

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
            var resolvedPath: string = path.resolve(value.installDestination);

            if (!utilHelper.isPathValid(resolvedPath)) {
                throw new Error(resources.getString("InvalidInstallPath", value.displayName, value.installDestination));
            }

            // Verify the path is empty if it exists
            if (fs.existsSync(value.installDestination)) {
                if (fs.readdirSync(value.installDestination).length > 0) {
                    throw new Error(resources.getString("PathNotEmpty", value.displayName, value.installDestination));
                }
            }

            // Verify that this path is not already used by another dependency
            var dependencyWithSamePath: string;
            var isPathUnique: boolean = !installPaths.some(function (previousInstallPath: { path: string; displayName: string; }): boolean {
                var path1: string = path.resolve(previousInstallPath.path);
                var path2: string = path.resolve(value.installDestination);

                if (path1 === path2) {
                    dependencyWithSamePath = previousInstallPath.displayName;
                    return true;
                }

                return false;
            });

            if (!isPathUnique) {
                throw new Error(resources.getString("PathNotUnique", value.displayName, dependencyWithSamePath));
            }

            // At this point, the values appear valid, so proceed with the instantiation of the installer for this dependency
            var dependencyWrapper: IDependencyWrapper = {
                dependency: value,
                installer: self.instantiateInstaller(value)
            };

            // Add the dependency to our list of dependencies to install
            self.missingDependencies.push(dependencyWrapper);

            // Cache install path
            installPaths.push({ displayName: value.displayName, path: value.installDestination });
        });
    }

    private instantiateInstaller(dependency: DependencyInstallerInterfaces.IDependency): InstallerBase {
        var installerInfoToUse: DependencyInstallerInterfaces.IInstallerData = this.dependenciesDataWrapper.getInstallerInfo(dependency.id, dependency.version);
        var installerRequirePath: string = path.join(__dirname, this.dependenciesDataWrapper.getInstallerPath(dependency.id));
        var installerConstructor: any = require(installerRequirePath);

        return new installerConstructor(installerInfoToUse, dependency.version, dependency.installDestination, this.logger);
    }

    private runInstallers(): Q.Promise<any> {
        var self = this;

        return this.missingDependencies.reduce(function (previous: Q.Promise<any>, value: IDependencyWrapper, currentIndex: number): Q.Promise<any> {
            return previous
                .then(function (): Q.Promise<any> {
                var baseHeaderString: string = currentIndex === 0 ? "" : "<br/>";

                self.logger.log(baseHeaderString + "<highlight>" + value.dependency.displayName + "</highlight>");

                return value.installer.run();
            })
                .catch(function (err: Error): void {
                    self.errorHandler(err);
            });
        }, Q({}));
    }

    private errorHandler(err: Error): void {
        this.installerErrorFlag = true;
        this.logger.logError(err.message);
    }
}

export = InstallerRunner;