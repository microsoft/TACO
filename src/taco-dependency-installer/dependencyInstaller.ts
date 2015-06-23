/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../typings/dependencyInstallerInterfaces.d.ts" />
/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/tacoUtils.d.ts" />
/// <reference path="../typings/toposort.d.ts" />

"use strict";

import childProcess = require ("child_process");
import fs = require ("fs");
import net = require ("net");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import toposort = require ("toposort");
import wrench = require ("wrench");

import DependencyDataWrapper = require ("./utils/dependencyDataWrapper");
import installerProtocol = require ("./elevatedInstallerProtocol");
import installerUtils = require ("./utils/installerUtils");
import resources = require ("./resources/resourceManager");
import tacoErrorCodes = require ("./tacoErrorCodes");
import errorHelper = require ("./tacoErrorHelper");
import tacoUtils = require ("taco-utils");
import util = require ("util");

import installerDataType = installerProtocol.DataType;
import installerExitCode = installerProtocol.ExitCode;
import IDependency = DependencyInstallerInterfaces.IDependency;
import logger = tacoUtils.Logger;
import loggerHelper = tacoUtils.LoggerHelper;
import TacoErrorCodes = tacoErrorCodes.TacoErrorCode;
import utilHelper = tacoUtils.UtilHelper;

// This represents the objects in the arrays that cordova.raw.requirements() returns. If Cordova ever changes their data format for missing requirements, this will need to be updated.
interface ICordovaRequirement {
    id?: string;
    name?: string;
    installed?: boolean;
    metadata?: {
        version?: string;
    }
}

// This dictionary represents the collection of results returned by cordova.raw.requirements(). Each tested platform either contains a rejected reason, or an array of ICordovaRequirement objects.
interface ICordovaRequirementsResult {
    [platform: string]: ICordovaRequirement[];
}

module TacoDependencyInstaller {
    export class DependencyInstaller {
        private static InstallConfigFolder: string = path.resolve(utilHelper.tacoHome);
        private static InstallConfigFile: string = path.join(DependencyInstaller.InstallConfigFolder, "installConfig.json");
        private static SocketPath: string = path.join("\\\\?\\pipe", utilHelper.tacoHome, "installer.sock");

        private dependenciesDataWrapper: DependencyDataWrapper;
        private unsupportedMissingDependencies: ICordovaRequirement[];
        private missingDependencies: IDependency[];
        
        private socketHandle: NodeJSNet.Socket;
        private serverHandle: NodeJSNet.Server;

        constructor() {
            this.dependenciesDataWrapper = new DependencyDataWrapper();
        }

        public run(requirementsResult: any): Q.Promise<any> {
            // Installing dependencies is currently only supported on Windows
            // TODO (DevDiv 1172346): Support Mac OS as well
            if (process.platform !== "win32") {
                return Q.reject(errorHelper.get(TacoErrorCodes.UnsupportedPlatform, process.platform));
            }

            // Parse 'cordova requirements' results and extract missing dependencies to end up with an array of IDs
            this.parseMissingDependencies(requirementsResult);

            // Warn the user for any dependencies for which installation is not supported
            this.displayUnsupportedWarning();

            // If there are no supported missing dependencies, we are done
            if (!this.missingDependencies.length) {
                logger.log(resources.getString("NothingToInstall"));

                return Q.resolve({});
            }

            // Sort the array of dependency IDs based on the order in which they need to be installed
            this.sortDependencies();

            // Print a summary of what is about to be installed, Wait for user confirmation, then spawn the elevated process which will perform the installations
            var self = this;

            return this.promptUserBeforeInstall()
                .then(function (): void {
                    self.createServer();
                })
                .then(function (): Q.Promise<any> {
                    return self.connectServer();
                })
                .then(function (): Q.Promise<number> {
                    return self.spawnElevatedInstaller();
                })
                .then(function (exitCode: number): void {
                    self.printSummaryLine(exitCode);
                });
        }

        private parseMissingDependencies(cordovaChecksResult: any): void {
            // Extract dependency IDs from Cordova results. Depending on whether we were able to require() Cordova or not, this result can be either a dictionary of ICordovaRequirement objects, or a string
            // representing the raw output of invoking 'cordova requirements'.
            var isString: boolean = typeof cordovaChecksResult === "string" || cordovaChecksResult instanceof String;
            var dependencyIds: ICordovaRequirement[] = isString ? this.parseFromString(cordovaChecksResult) : this.parseFromRawResult(cordovaChecksResult);

            // Initialize arrays
            this.unsupportedMissingDependencies = [];
            this.missingDependencies = [];

            // Process cordova results
            var self = this;

            dependencyIds.forEach(function (value: ICordovaRequirement): void {
                if (self.canInstallDependency(value)) {
                    // Only add the dependency to our list if it is not an implicit dependency. An implicit dependency is a dependency that is installed as part of a different dependency, so no explicit
                    // processing is required. For example, android SDK packages are implicit, because they are considered a standalone dependency by Cordova but are installed as part of Android SDK in
                    // this dependency installer.
                    if (!self.dependenciesDataWrapper.isImplicit(value.id)) {
                        var versionToUse: string = value.metadata && value.metadata.version ? value.metadata.version : self.dependenciesDataWrapper.getFirstValidVersion(value.id);
                        var installPath: string = self.dependenciesDataWrapper.getInstallDirectory(value.id, versionToUse);
                        var expandedInstallPath: string = path.resolve(utilHelper.expandEnvironmentVariables(installPath));

                        var dependencyInfo: IDependency = {
                            id: value.id,
                            version: versionToUse,
                            displayName: self.dependenciesDataWrapper.getDisplayName(value.id),
                            licenseUrl: self.dependenciesDataWrapper.getLicenseUrl(value.id),
                            installDestination: expandedInstallPath,
                        };

                        self.missingDependencies.push(dependencyInfo);
                    }
                } else {
                    self.unsupportedMissingDependencies.push(value);
                }
            });
        }

        private parseFromString(output: string): ICordovaRequirement[] {
            // If we parse the output, we are going to be dealing with display names rather than IDs for the dependencies, so we need a dictionary mapping names to IDs. These are taken directly from Cordova,
            // so they need to be updated here if Cordova ever changes them.
            var namesToIds: { [name: string]: string } = {
                "Java JDK": "java",
                "Android SDK": "androidSdk",
                "Android target": "androidTarget",
                Gradle: "gradle"
            };

            // Extract the names of the missing dependencies by parsing the output of the command. Here is an example of the output that 'cordova requirements' gives:
            /*
                Requirements check results for android:
                Java JDK: installed 1.7.0
                Android SDK: installed
                Android target: not installed
                [Error: Please install Android target: "android-22".

                Hint: Open the SDK manager by running: C:\Program\ Files\ (x86)\Android\android-sdk-windows\tools\android.BAT
                You will require:
                1. "SDK Platform" for android-22
                2. "Android SDK Platform-tools (latest)
                3. "Android SDK Build-tools" (latest)]
                Gradle: not installed
                [Error: Could not find gradle wrapper within Android SDK. Might need to update your Android SDK. Looked here: C:\Program Files (x86)\Android\android-sdk-windows\tools\templates\gradle\wrapper]
                Some of requirements check failed
            */
            var dependencies: ICordovaRequirement[] = [];
            var re: RegExp = /(.+?): not installed/g;
            var result: RegExpExecArray;

            while (result = re.exec(output)) {
                // The captured dependency name will be at index 1 of the result
                var dependencyName: string = result[1];

                var req: ICordovaRequirement = {
                    id: namesToIds[dependencyName],
                    installed: false,
                    name: dependencyName
                };

                dependencies.push(req);
            }

            return dependencies;
        }

        private parseFromRawResult(results: ICordovaRequirementsResult): ICordovaRequirement[] {
            var dependencies: ICordovaRequirement[] = [];

            Object.keys(results).forEach(function (key: string): void {
                if (util.isArray(results[key])) {
                    // If the key is an array, it means the check was successful for this platform, so we add the results to our dependency IDs
                    dependencies = dependencies.concat(results[key].filter(function (value: ICordovaRequirement): boolean {
                        // We only keep requirements that are not installed
                        return !value.installed;
                    }));
                }
            });

            return dependencies;
        }

        private canInstallDependency(cordovaDependencyResult: ICordovaRequirement): boolean {
            // If there is no ID property, then we can't understand this cordova result
            if (!cordovaDependencyResult.id) {
                return false;
            }

            // Verify if this ID exists in our metadata
            if (!this.dependenciesDataWrapper.dependencyExists(cordovaDependencyResult.id)) {
                return false;
            }

            // If the dependency is implicit, we can install it
            if (this.dependenciesDataWrapper.isImplicit(cordovaDependencyResult.id)) {
                return true;
            }

            // If cordova is requesting a specific version we need additional verifications
            var requestedVersion: string = cordovaDependencyResult.metadata ? cordovaDependencyResult.metadata.version : null;

            if (requestedVersion) {
                // If Cordova requested a specific version, we support this dependency if we have an installer for that version, and that installer has an entry for the current platform
                return this.dependenciesDataWrapper.versionExists(cordovaDependencyResult.id, requestedVersion) && this.dependenciesDataWrapper.isSystemSupported(cordovaDependencyResult.id, requestedVersion);
            } else {
                // Cordova did not request a specific version, so look if we have at least one installer version that supports the user's platform
                return !!this.dependenciesDataWrapper.getFirstValidVersion(cordovaDependencyResult.id);
            }
        }

        private displayUnsupportedWarning(): void {
            if (this.unsupportedMissingDependencies.length > 0) {
                logger.log(resources.getString("UnsupportedDependenciesHeader"));

                this.unsupportedMissingDependencies.forEach(function (value: ICordovaRequirement): void {
                    var displayName: string = value.name || value.id;
                    var version: string = value.metadata ? value.metadata.version : null;

                    if (!displayName) {
                        // This dependency doesn't have an ID nor a display name. The data returned by Cordova must be malformed, so skip printing this dependency.
                        return;
                    }

                    logger.log(resources.getString("DependencyLabel", displayName));

                    if (version) {
                        logger.log(resources.getString("DependencyVersion", version));
                    }
                });
            }
        }

        private sortDependencies(): void {
            var self = this;

            // Build a representation of the graph in a way that is understood by the toposort package
            var nodes: string[] = [];
            var edges: string[][] = [];

            this.missingDependencies.forEach(function (dependency: IDependency): void {
                // A node is simply the ID of a dependency
                nodes.push(dependency.id);

                // An edge is an array containing 2 nodes which correspond to the start and the end of the edge
                var prerequisites: string[] = self.dependenciesDataWrapper.getPrerequisites(dependency.id);

                prerequisites.forEach(function (prereq: string): void {
                    // Only create an edge if prereq is in the list of missing dependencies
                    var isPrereqMissing: boolean = self.missingDependencies.some(function (dep: IDependency): boolean {
                        return dep.id === prereq;
                    });

                    if (isPrereqMissing) {
                        edges.push([dependency.id, prereq]);
                    }
                });
            });

            // Sort the IDs; we reverse because toposort assumes the edges mean ancestry, when in our case they mean descendancy
            var sortedIds: string[] = toposort.array<string>(nodes, edges).reverse();

            // Reorder the missing dependencies based on the sorted IDs
            this.missingDependencies.sort(function (a: IDependency, b: IDependency): number {
                return sortedIds.indexOf(a.id) - sortedIds.indexOf(b.id);
            });
        }

        private promptUserBeforeInstall(): Q.Promise<any> {
            this.buildInstallConfigFile();

            var needsLicenseAgreement: boolean = this.missingDependencies.some(function (value: IDependency): boolean {
                // Return true if at least one of the missing dependencies has a license url, false if not
                return !!value.licenseUrl;
            });

            logger.logLine();
            loggerHelper.logSeparatorLine();
            logger.logLine();
            logger.log(resources.getString("InstallingDependenciesHeader"));
            this.missingDependencies.forEach(function (value: IDependency): void {
                logger.log(resources.getString("DependencyLabel", value.displayName));
                logger.log(resources.getString("DependencyVersion", value.version));
                logger.log(resources.getString("InstallDestination", value.installDestination));

                if (value.licenseUrl) {
                    logger.log(resources.getString("DependencyLicense", value.licenseUrl));
                }
            });

            logger.logLine();
            loggerHelper.logSeparatorLine();
            logger.logLine();
            logger.log(resources.getString("ModifyInstallPaths", DependencyInstaller.InstallConfigFile));

            if (needsLicenseAgreement) {
                logger.log(resources.getString("LicenseAgreement"));
            }

            logger.log(resources.getString("InstallationProceedQuestion"));

            return installerUtils.promptUser(resources.getString("YesExampleString"))
                .then(function (answer: string): Q.Promise<any> {
                    if (answer === resources.getString("YesString")) {
                        logger.logLine();
                        loggerHelper.logSeparatorLine();
                        logger.logLine();

                        return Q.resolve({});
                    } else {
                        return Q.reject(errorHelper.get(TacoErrorCodes.LicenseAgreementError));
                    }
                });
        }

        private buildInstallConfigFile(): void {
            try {
                if (fs.existsSync(DependencyInstaller.InstallConfigFile)) {
                    fs.unlinkSync(DependencyInstaller.InstallConfigFile);
                }
            } catch (err) {
                throw errorHelper.get(TacoErrorCodes.ErrorDeletingInstallConfig, DependencyInstaller.InstallConfigFile);
            }

            try {
                // Create a JSON object wrapper around our array of missing dependencies
                var jsonWrapper = {
                    dependencies: this.missingDependencies
                };

                // Write the json object to the config file
                wrench.mkdirSyncRecursive(DependencyInstaller.InstallConfigFolder, 511); // 511 decimal is 0777 octal
                fs.writeFileSync(DependencyInstaller.InstallConfigFile, JSON.stringify(jsonWrapper, null, 4));
            } catch (err) {
                throw errorHelper.get(TacoErrorCodes.ErrorCreatingInstallConfig, DependencyInstaller.InstallConfigFile);
            }
        }

        private createServer(): void {
            var self = this;

            this.serverHandle = net.createServer(function (socket: net.Socket): void {
                self.socketHandle = socket;
                socket.on("data", function (data: Buffer): void {
                    // Messages can sometimes be sent in close succession, which causes more than one message to be captured in a single "data" event. For this reason, we send
                    // a newline after each message, and here we perform a split on newline characters to make sure we process each message individually. For now, the messages
                    // are short enough that this works, but if messages ever start becoming bigger, we may end up in a situation where the last message is truncated an sent
                    // in 2 different "data" events. If this ever happens, we will need to modify this event handler logic to wait until we have received an outer closing
                    // curly brace before processing a message.
                    var dataArray: string[] = data.toString().split(os.EOL);

                    dataArray.forEach(function (value: string): void {
                        if (!value) {
                            return;
                        }

                        var parsedData: installerProtocol.IElevatedInstallerMessage = JSON.parse(value);

                        switch (parsedData.dataType) {
                            case installerDataType.Prompt:
                                self.promptUser(parsedData.message);
                                break;
                            case installerDataType.Error:
                                logger.logError(parsedData.message);
                                break;
                            case installerDataType.Warning:
                                logger.logWarning(parsedData.message);
                                break;
                            case installerDataType.Log:
                                logger.log(parsedData.message);
                        }
                    });
                });
            });
        }

        private promptUser(msg: string): void {
            var self = this;

            installerUtils.promptUser(msg)
                .then(function (answer: string): void {
                    self.socketHandle.write(answer);
                });
        }

        private connectServer(): Q.Promise<any> {
            var deferred = Q.defer();

            this.serverHandle.listen(DependencyInstaller.SocketPath, function (): void {
                deferred.resolve({});
            });

            return deferred.promise;
        }

        private spawnElevatedInstaller(): Q.Promise<number> {
            switch (process.platform) {
                case "win32":
                    return this.spawnElevatedInstallerWin32();
                default:
                    return Q.reject<number>(errorHelper.get(TacoErrorCodes.UnsupportedPlatform, process.platform));
            }
        }

        private spawnElevatedInstallerWin32(): Q.Promise<number> {
            var self = this;
            var deferred: Q.Deferred<number> = Q.defer<number>();
            var launcherPath: string = path.resolve(__dirname, "utils", "win32", "elevatedInstallerLauncher.ps1");
            var elevatedInstallerPath: string = path.resolve(__dirname, "elevatedInstaller.js");
            var command: string = "powershell";
            var args: string[] = [
                "-executionpolicy",
                "unrestricted",
                "-file",
                launcherPath,
                utilHelper.quotesAroundIfNecessary(elevatedInstallerPath),
                utilHelper.quotesAroundIfNecessary(DependencyInstaller.SocketPath),
                utilHelper.quotesAroundIfNecessary(DependencyInstaller.InstallConfigFile)
            ];
            var cp: childProcess.ChildProcess = childProcess.spawn(command, args);

            cp.on("error", function (err: Error): void {
                // Handle ENOENT if Powershell is not found
                if (err.name === "ENOENT") {
                    deferred.reject(errorHelper.get(TacoErrorCodes.NoPowershell));
                } else {
                    deferred.reject(errorHelper.wrap(TacoErrorCodes.UnknownExitCode, err));
                }
            });

            cp.on("exit", function (code: number): void {
                self.serverHandle.close(function (): void {
                    deferred.resolve(code);
                });
            });

            return deferred.promise;
        }

        private printSummaryLine(code: number): void {
            logger.logLine();
            loggerHelper.logSeparatorLine();
            logger.logLine();

            switch (code) {
                case installerExitCode.CompletedWithErrors:
                    logger.logError(resources.getString("InstallCompletedWithErrors"));
                    break;
                case installerExitCode.CouldNotConnect:
                    throw errorHelper.get(TacoErrorCodes.CouldNotConnect);
                    break;
                case installerExitCode.NoAdminRights:
                    throw errorHelper.get(TacoErrorCodes.NoAdminRights);
                    break;
                case installerExitCode.Success:
                    logger.log(resources.getString("InstallCompletedSuccessfully"));
                    break;
                case installerExitCode.FatalError:
                    throw errorHelper.get(TacoErrorCodes.FatalError);
                default:
                    throw errorHelper.get(TacoErrorCodes.UnknownExitCode);
            }

            if (code === installerExitCode.Success || code === installerExitCode.CompletedWithErrors) {
                logger.log(resources.getString("RestartCommandPrompt"));
            }
        }
    }
}

export = TacoDependencyInstaller;