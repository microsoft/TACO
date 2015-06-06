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
import net = require ("net");
import path = require ("path");
import Q = require ("q");
import sanitizeFilename = require ("sanitize-filename");

import DependencyDataWrapper = require ("./utils/dependencyDataWrapper");
import InstallerBase = require ("./installers/installerBase");
import installerUtils = require ("./utils/installerUtils");
import protocol = require ("./elevatedInstallerProtocol");
import resources = require ("./resources/resourceManager");

import installerDataType = protocol.DataType;

interface IDependencyWrapper {
    dependency: DependencyInstallerInterfaces.IDependency;
    installer: InstallerBase;
}

// Internal class for an ILogger specifically designed for the communication between the elevatedInstaller and the dependencyInstaller
class InstallerLogger implements protocol.ILogger {
    private socketHandle: NodeJSNet.Socket;

    constructor(socket: NodeJSNet.Socket) {
        this.socketHandle = socket;
    }

    public log(message: string): void {
        installerUtils.sendData(this.socketHandle, message);
    }

    public logWarning(message: string): void {
        installerUtils.sendData(this.socketHandle, message, installerDataType.Warning);
    }

    public logError(message: string): void {
        installerUtils.sendData(this.socketHandle, message, installerDataType.Error);
    }

    public promptForEnvVariableOverwrite(name: string): Q.Promise<any> {
        return installerUtils.promptForEnvVariableOverwrite(name, this.socketHandle);
    }
}

/*
 * Takes care of installing the missing third-party dependencies on the user's system. This file should be executed inside a separate process that has administrator privileges. DependencyInstaller.ts
 * is responsible for starting that elevated process.
 * 
 * This script starts by parsing the installation configuration file that DependencyInstaller created in taco_home. The file contains information on what dependencies need to be installed. After
 * parsing and validating the content, specialized installers that know how to handle specific dependencies are instantiated. The user is then presented with a summary of what is about to be
 * installed, and is prompted for confirmation. The specialized installers are then run in order of prerequisites (for example, java needs to be installed before Android SDK). Finally, this process
 * exits with the proper exit code (exit codes are defined in ElevatedInstallerProtocol).
 *
 * Because this is a separate process, and because it is not possible to intercept the stdio of an elevated process from a non-elevated one, the communication between this and DependencyInstaller is
 * made via a local socket that this script connects to and that DependencyInstaller listens to.
 */
class ElevatedInstaller {    
    private dependenciesDataWrapper: DependencyDataWrapper;
    private missingDependencies: IDependencyWrapper[];
    private errorFlag: boolean;
    private socketPath: string;
    private socketHandle: NodeJSNet.Socket;
    private configFile: string;
    private logger: protocol.ILogger;

    constructor() {
        this.errorFlag = false;
        this.dependenciesDataWrapper = new DependencyDataWrapper();
        this.socketPath = process.argv[2];
        this.configFile = process.argv[3];
    }

    public run(): void {
        var self = this;

        this.connectToServer()
            .then(function (): void {
                self.logger = new InstallerLogger(self.socketHandle);
                self.parseInstallConfig();
            })
            .catch(function (err: Error): void {
                // If there was an error during the parsing and validation of the installation config file, we consider this a fatal error and we exit immediately
                installerUtils.sendData(self.socketHandle, "<error>" + err.message + "</error>");
                self.socketHandle.end();
                process.exit(protocol.ExitCode.FatalError);
            })
            .then(function (): Q.Promise<any> {
                return self.runInstallers();
            })
            .catch(function (err: Error): void {
                self.errorHandler(err);
            })
            .then(function (): void {
                self.exitProcess();
            });
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
            var root: string = (<any>path).parse(resolvedPath).root;

            if (root && !fs.existsSync(root)) {
                throw new Error(resources.getString("InvalidInstallPath", value.displayName, value.installDestination));
            }

            resolvedPath.split(path.sep).forEach(function (dirName: string, index: number): void {
                // Don't test the very first segment if we had a root
                if (index === 0 && root) {
                    return;
                }

                if (sanitizeFilename(dirName) !== dirName) {
                    // The current path segment is not a valid directory name
                    throw new Error(resources.getString("InvalidInstallPath", value.displayName, value.installDestination));
                }
            });

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

        return this.missingDependencies.reduce(function (previous: Q.Promise<any>, value: IDependencyWrapper): Q.Promise<any> {
            return previous
                .then(function (): Q.Promise<any> {
                    installerUtils.sendData(self.socketHandle, "<br/><id>" + value.dependency.displayName + "</id>");

                    return value.installer.run();
                })
                .catch(self.errorHandler.bind(self));
        }, Q({}));
    }

    private errorHandler(err: Error): void {
        this.errorFlag = true;
        installerUtils.sendData(this.socketHandle, "<error>" + err.message + "</error>");
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