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
        return tacoUtils.TelemetryHelper.generate("InstallerRunner", (telemetry: tacoUtils.TelemetryGenerator) => {
            var self: InstallerRunner = this;
            return Q({})
                .then(function(): void {
                    telemetry.step("parseInstallConfig");
                    self.parseInstallConfig(telemetry);
                })
                .then(function(): Q.Promise<any> {
                    telemetry.step("runInstallers");
                    return self.runInstallers();
                })
                .then(function(): number {
                    // If we reach this point, it means we ran the installers. Verify if there was an installation error and return appropriately.
                    telemetry.step("runInstallersFinished").add("installerErrorFlag", self.installerErrorFlag, /*isPii*/ false);
                    if (self.installerErrorFlag) {
                        return ExitCode.CompletedWithErrors;
                    }

                    return ExitCode.Success;
                })
                .catch(function(err: Error): number {
                    // If we reach this point, it either means we had an unknown error or a config file validation error. Both cases have a return code of FatalError.
                    telemetry.step("catch").add("errorMessage", err.message, /*isPii*/ false);
                    self.logger.logError(err.message);

                    return ExitCode.FatalError;
                });
        });
    }

    private parseInstallConfig(telemetry: tacoUtils.TelemetryGenerator): void {
        var self: InstallerRunner = this;
        var parsedData: DependencyInstallerInterfaces.IInstallerConfig = null;

        if (!fs.existsSync(this.configFile)) {
            throw new Error(resources.getString("InstallConfigNotFound", this.configFile));
        }

        try {
            parsedData = require(this.configFile);
        } catch (err) {
            throw new Error(resources.getString("InstallConfigMalformed"));
        }

        if (!parsedData.dependencies) {
            throw new Error(resources.getString("InstallConfigMalformed"));
        }

        var installPaths: { path: string; displayName: string; }[] = [];

        this.missingDependencies = [];
        parsedData.dependencies.forEach(function(value: DependencyInstallerInterfaces.IDependency): void {
            // Verify the dependency id exists
            if (!self.dependenciesDataWrapper.dependencyExists(value.id)) {
                throw new Error(resources.getString("UnknownDependency", value.id));
            }

            // Verify the version exists for the dependency
            if (!self.dependenciesDataWrapper.versionExists(value.id, value.version)) {
                throw new Error(resources.getString("UnknownVersion", value.id, value.version));
            }

            // If an install destination is present, validate it
            if (value.installDestination) {
                // Verify the path is valid
                var resolvedPath: string = path.resolve(value.installDestination);

                if (!utilHelper.isPathValid(resolvedPath)) {
                    throw new Error(resources.getString("InvalidInstallPath", value.displayName, value.installDestination));
                }

                // Verify that the destination folder is empty if it already exists
                if (fs.existsSync(value.installDestination)) {
                    var dirItems: string[] = fs.readdirSync(value.installDestination);

                    if (dirItems.length > 0) {
                        // For Darwin platform, the directory can contain a ".DS_Store" file, which we need to ignore (the directory is essentially empty in that case)
                        if (process.platform !== "darwin" || dirItems.length !== 1 || dirItems[0] !== ".DS_Store") {
                            throw new Error(resources.getString("PathNotEmpty", value.displayName, value.installDestination));
                        }
                    }
                }

                // Verify that this path is not already used by another dependency
                var dependencyWithSamePath: string;
                var isPathUnique: boolean = !installPaths.some(function(previousInstallPath: { path: string; displayName: string; }): boolean {
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

                // Cache install path for the next dependency validations
                installPaths.push({ displayName: value.displayName, path: value.installDestination });
            }

            // At this point, the values appear valid, so proceed with the instantiation of the installer for this dependency
            var dependencyWrapper: IDependencyWrapper = {
                dependency: value,
                installer: self.instantiateInstaller(value)
            };

            // We want to know if the users like to change the default installation directory, or not, to improve the experience if neccesary
            var defaultInstallDirectory: string = self.dependenciesDataWrapper.getInstallDirectory(value.id, value.version);
            if (defaultInstallDirectory && value.installDestination) {
                var normalizedDefaultInstallDirectory: string = path.normalize(utilHelper.expandEnvironmentVariables(defaultInstallDirectory));
                var normalizedInstallDestination: string = path.normalize(value.installDestination);
                var isDefault: boolean = normalizedDefaultInstallDirectory === normalizedInstallDestination;
                telemetry.add("installDestination.isDefault", isDefault, /*isPii*/ false);
                telemetry.add("installDestination.path", normalizedInstallDestination, /*isPii*/ true);
            } else {
                telemetry.add("installDestination.defaultIsNull", !defaultInstallDirectory, /*isPii*/ false);
                telemetry.add("installDestination.destinationIsNull", !value.installDestination, /*isPii*/ false);
            }

            // Add the dependency to our list of dependencies to install
            self.missingDependencies.push(dependencyWrapper);
        });
    }

    private instantiateInstaller(dependency: DependencyInstallerInterfaces.IDependency): InstallerBase {
        var installerInfoToUse: DependencyInstallerInterfaces.IInstallerData = this.dependenciesDataWrapper.getInstallerInfo(dependency.id, dependency.version);
        var installerSteps: DependencyInstallerInterfaces.IStepsDeclaration = this.dependenciesDataWrapper.getInstallerSteps(dependency.id, dependency.version);
        var installerRequirePath: string = path.join(__dirname, this.dependenciesDataWrapper.getInstallerPath(dependency.id));
        var installerConstructor: any = require(installerRequirePath);

        return new installerConstructor(installerInfoToUse, dependency.version, dependency.installDestination, this.logger, installerSteps);
    }

    private runInstallers(): Q.Promise<any> {
        var self: InstallerRunner = this;
        var baseHeaderString: string = "";

        return tacoUtils.PromisesUtils.chain(this.missingDependencies, (value: IDependencyWrapper) => {
            self.logger.log(baseHeaderString + "<highlight>" + value.dependency.displayName + "</highlight>");
            // we need a newline after printing entry
            if (!baseHeaderString) {
                baseHeaderString = "<br/>"
            }

            return Q({})
                .then(() => value.installer.run())
                .catch(function(err: Error): void {
                    self.installerErrorFlag = true;
                    self.logger.logError(err.message);
                });
        });
    }

}

export = InstallerRunner;
