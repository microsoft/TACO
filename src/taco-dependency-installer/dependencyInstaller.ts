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

"use strict";

import childProcess = require ("child_process");
import fs = require ("fs");
import net = require ("net");
import path = require ("path");
import Q = require ("q");
import wrench = require ("wrench");

import DependencyDataWrapper = require ("./utils/dependencyDataWrapper");
import DirectedAcyclicGraph = require ("./utils/directedAcyclicGraph");
import installerProtocol = require ("./installerProtocol");
import installerUtils = require ("./utils/installerUtils");
import resources = require ("./resources/resourceManager");
import tacoErrorCodes = require ("./tacoErrorCodes");
import errorHelper = require ("./tacoErrorHelper");
import tacoUtils = require ("taco-utils");

import installerDataType = installerProtocol.DataType;
import installerExitCode = installerProtocol.ExitCode;
import logger = tacoUtils.Logger;
import TacoErrorCodes = tacoErrorCodes.TacoErrorCode;
import utilHelper = tacoUtils.UtilHelper;

module TacoDependencyInstaller {
    export class DependencyInstaller {
        private static InstallConfigFolder: string = path.resolve(utilHelper.tacoHome);
        private static InstallConfigFile: string = path.join(DependencyInstaller.InstallConfigFolder, "installConfig.json");
        private static SocketPath: string = path.join("\\\\?\\pipe", utilHelper.tacoHome, "installer.sock");

        private dependenciesDataWrapper: DependencyDataWrapper;
        private unsupportedMissingDependencies: any[];
        private missingDependencies: DependencyInstallerInterfaces.IDependency[];
        
        private socketHandle: NodeJSNet.Socket;
        private serverHandle: NodeJSNet.Server;

        constructor() {
            this.dependenciesDataWrapper = new DependencyDataWrapper();
        }

        public run(targetPlatforms: string[]): Q.Promise<any> {
            // Installing dependencies is currently only supported on Windows
            // TODO (DevDiv 1172346): Support Mac OS as well
            if (process.platform !== "win32") {
                return Q.reject(errorHelper.get(TacoErrorCodes.UnsupportedPlatform, process.platform));
            }

            // Verify that all specified target platforms are supported
            // Android is currently the only supported target platform
            var supportedTargetPlatforms: string[] = [
                "android"
            ];
            var unsupportedTargetPlatforms: string[] = targetPlatforms.filter(function (targetPlatform: string): boolean {
                // If targetPlatform is in our known platforms, we keep it
                return supportedTargetPlatforms.indexOf(targetPlatform) !== -1;
            });

            if (unsupportedTargetPlatforms.length !== 0) {
                // Return an error with the first unsupported platform
                return Q.reject(errorHelper.get(TacoErrorCodes.UnsupportedTargetPlatform, unsupportedTargetPlatforms[0]));
            }

            // Call into Cordova to check missing dependencies for the current project
            var cordovaResults: any[] = DependencyInstaller.callCordovaCheckDependencies(targetPlatforms);

            // Extract Cordova results and transform them to an array of dependency ids
            this.parseMissingDependencies(cordovaResults);

            // Warn the user for any dependencies for which installation is not supported
            this.displayUnsupportedWarning();

            // Sort the array of dependency ids based on the order in which they need to be installed
            this.sortDependencies();

            // Print a summary of what is about to be installed, Wait for user confirmation, then spawn the elevated process which will perform the installations
            return this.promptUserBeforeInstall()
                .then(this.createServer.bind(this))
                .then(this.connectServer.bind(this))
                .then(this.spawnElevatedInstaller.bind(this))
                .then(this.printSummaryLine.bind(this));
        }

        private static callCordovaCheckDependencies(targetPlatforms: string[]): any[] {
            // TODO (DevDiv 1170232): Call Cordova when they have added dependency checking
            // TEMP Example of what cordova cheq_reqs could return
            return [
                {
                    id: "androidSdk",
                    name: "Android SDK",
                    metadata: {
                    }
                },
                {
                    id: "ant",
                    name: "Apache Ant",
                },
                {
                    id: "gradle",
                    name: "Gradle",
                },
                {
                    id: "ios-deploy",
                    name: "ios-deploy",
                },
                {
                    id: "ios-sim",
                    name: "ios-sim",
                    metadata: {
                        version: "test"
                    }
                },
                {
                    id: "javaJdk",
                    name: "Java SE Development Kit",
                    metadata: {}
                },
                {
                    id: "msbuild",
                    name: "Microsoft Build Tools",
                },
                {
                    id: "xcode",
                    name: "XCode",
                    metadata: {
                    }
                }
            ];
        }

        private parseMissingDependencies(cordovaChecksResult: any[]): void {
            // Initialize arrays
            this.unsupportedMissingDependencies = [];
            this.missingDependencies = [];

            // Process cordova results
            var self = this;

            cordovaChecksResult.forEach(function (value: any): void {
                if (self.canInstallDependency(value)) {
                    var versionToUse: string = value.metadata && value.metadata.version ? value.metadata.version : self.dependenciesDataWrapper.firstValidVersion(value.id);
                    var installPath: string = path.resolve(installerUtils.expandPath(self.dependenciesDataWrapper.getInstallDirectory(value.id, versionToUse)));
                    var dependencyInfo: DependencyInstallerInterfaces.IDependency = {
                        id: value.id,
                        version: versionToUse,
                        displayName: self.dependenciesDataWrapper.getDisplayName(value.id),
                        licenseUrl: self.dependenciesDataWrapper.getLicenseUrl(value.id),
                        installDestination: installPath,
                    };

                    self.missingDependencies.push(dependencyInfo);
                } else {
                    self.unsupportedMissingDependencies.push(value);
                }
            });
        }

        private canInstallDependency(cordovaDependencyResult: any): boolean {
            // If there is no id property, then we can't understand this cordova result
            if (!cordovaDependencyResult.id) {
                return false;
            }

            if (!this.dependenciesDataWrapper.dependencyExists(cordovaDependencyResult.id)) {
                return false;
            }

            // If cordova is requesting a specific version we need additional verifications
            var requestedVersion: string = cordovaDependencyResult.metadata ? cordovaDependencyResult.metadata.version : null;

            if (requestedVersion) {
                // If Cordova requested a specific version, we support this dependency if we have an installer for that version, and that installer has an entry for the current platform
                return this.dependenciesDataWrapper.versionExists(cordovaDependencyResult.id, requestedVersion) && this.dependenciesDataWrapper.isSystemSupported(cordovaDependencyResult.id, requestedVersion);
            } else {
                // Cordova did not request a specific version, so look if we have at least one installer version that supports the user's platform
                return !!this.dependenciesDataWrapper.firstValidVersion(cordovaDependencyResult.id);
            }
        }

        private displayUnsupportedWarning(): void {
            if (this.unsupportedMissingDependencies.length > 0) {
                logger.logWarnLine(resources.getString("UnsupportedDependenciesHeader"));

                this.unsupportedMissingDependencies.forEach(function (value: any, index: number, array: any[]): void {
                    var displayName: string = value.name || value.id;
                    var version: string = value.metadata ? value.metadata.version : null;

                    if (!displayName) {
                        // TODO (DevDiv 1170232): When cordova's dependency checker is implemented and we know the format of their results, try to find a better way to handle cases where neither a display name nor an id is provided
                        // TEMP We can't print this dependency nicely, skip it
                        return;
                    }

                    logger.log(resources.getString("DependencyLabel"));
                    logger.log(displayName, logger.Level.NormalBold);

                    if (version) {
                        logger.log("\n");
                        logger.log(resources.getString("DependencyVersion", version));
                    }

                    logger.log("\n");
                    logger.log("\n");
                });

                logger.log("============================================================\n");
                logger.log("\n");
            }
        }

        private sortDependencies(): void {
            var self = this;
            var adjacencyList: DirectedAcyclicGraph.IVertexIdentifier[] = [];

            this.missingDependencies.forEach(function (value: DependencyInstallerInterfaces.IDependency): void {
                var vertexIdentifier: DirectedAcyclicGraph.IVertexIdentifier = {
                    id: value.id,
                    neighbors: self.dependenciesDataWrapper.getPrerequisites(value.id)
                };

                adjacencyList.push(vertexIdentifier);
            });

            var graph: DirectedAcyclicGraph = new DirectedAcyclicGraph(adjacencyList);
            var sortedIds: string[] = graph.topologicalSort();
            var sortedDependencies: DependencyInstallerInterfaces.IDependency[] = [];

            sortedIds.forEach(function (value: string): void {
                var nextDependencyIndex: number;

                for (var i: number = 0; i < self.missingDependencies.length; i++) {
                    if (self.missingDependencies[i].id === value) {
                        nextDependencyIndex = i;
                        break;
                    }
                }

                sortedDependencies.push(self.missingDependencies[nextDependencyIndex]);
            });

            this.missingDependencies = sortedDependencies;
        }

        private promptUserBeforeInstall(): Q.Promise<any> {
            this.buildInstallConfigFile();

            var needsLicenseAgreement: boolean = this.missingDependencies.some(function (value: DependencyInstallerInterfaces.IDependency): boolean {
                // Return true if there is a license url, false if not
                return !!value.licenseUrl;
            });

            logger.logNormalBoldLine(resources.getString("InstallingDependenciesHeader"));
            this.missingDependencies.forEach(function (value: DependencyInstallerInterfaces.IDependency): void {
                logger.log(resources.getString("DependencyLabel"));
                logger.log(value.displayName, logger.Level.NormalBold);
                logger.log("\n");
                logger.logNormalLine(resources.getString("DependencyVersion", value.version));
                logger.logNormalLine(resources.getString("InstallDestination", value.installDestination));

                if (value.licenseUrl) {
                    logger.logNormalLine(resources.getString("DependencyLicense", value.licenseUrl));
                }

                logger.log("\n");
            });

            logger.logNormalLine("============================================================");
            logger.log("\n");
            logger.logNormalLine(resources.getString("ModifyInstallPaths", DependencyInstaller.InstallConfigFile));
            logger.log("\n");

            if (needsLicenseAgreement) {
                logger.logNormalLine(resources.getString("LicenseAgreement"));
                logger.log("\n");
            }

            logger.logNormalLine(resources.getString("Proceed"));

            return installerUtils.promptUser(resources.getString("YesExampleString"))
                .then(function (answer: string): Q.Promise<any> {
                    if (answer === resources.getString("YesString")) {
                        logger.log("\n");

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
                errorHelper.get(TacoErrorCodes.ErrorDeletingInstallConfig, DependencyInstaller.InstallConfigFile);
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
                errorHelper.get(TacoErrorCodes.ErrorCreatingInstallConfig, DependencyInstaller.InstallConfigFile);
            }
        }

        private createServer(): void {
            var self = this;

            this.serverHandle = net.createServer(function (socket: net.Socket): void {
                self.socketHandle = socket;
                socket.on("data", function (data: Buffer): void {
                    var dataArray: string[] = data.toString().split("\n");

                    dataArray.forEach(function (value: string): void {
                        if (!value) {
                            return;
                        }

                        var parsedData: installerProtocol.IData = JSON.parse(value);

                        switch (parsedData.dataType) {
                            case installerDataType.Success:
                                logger.logSuccessLine(parsedData.message);
                                break;
                            case installerDataType.Bold:
                                logger.log("\n");
                                logger.logNormalBoldLine(parsedData.message);
                                break;
                            case installerDataType.Warn:
                                logger.logWarnLine(parsedData.message);
                                break;
                            case installerDataType.Error:
                                logger.logErrorLine(parsedData.message);
                                break;
                            case installerDataType.Prompt:
                                self.promptUser(parsedData.message);
                                break;
                            case installerDataType.Output:
                            default:
                                logger.logNormalLine(parsedData.message);
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
            logger.logNormalLine("============================================================");
            logger.log("\n");

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
            logger.log("\n");
            logger.logNormalLine("============================================================");
            logger.log("\n");

            switch (code) {
                case installerExitCode.CompletedWithErrors:
                    logger.logErrorLine(resources.getString("InstallCompletedWithErrors"));
                    break;
                case installerExitCode.CouldNotConnect:
                    throw errorHelper.get(TacoErrorCodes.CouldNotConnect);
                    break;
                case installerExitCode.NoAdminRights:
                    throw errorHelper.get(TacoErrorCodes.NoAdminRights);
                    break;
                case installerExitCode.Success:
                    logger.logSuccessLine(resources.getString("InstallCompletedSuccessfully"));
                    break;
                case installerExitCode.FatalError:
                    throw errorHelper.get(TacoErrorCodes.FatalError);
                default:
                    throw errorHelper.get(TacoErrorCodes.UnknownExitCode);
            }
        }
    }
}

export = TacoDependencyInstaller;