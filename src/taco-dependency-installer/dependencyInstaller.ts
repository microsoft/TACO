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
import os = require ("os");
import path = require ("path");
import net = require ("net");
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

import logger = tacoUtils.Logger;
import TacoErrorCodes = tacoErrorCodes.TacoErrorCode;
import utilHelper = tacoUtils.UtilHelper;

module TacoDependencyInstaller {
    export class DependencyInstaller {
        private static DataFile: string = path.resolve(__dirname, "dependencies.json");
        private static InstallConfigFolder: string = path.resolve(utilHelper.tacoHome);
        private static InstallConfigFile: string = path.join(DependencyInstaller.InstallConfigFolder, "installConfig.json");
        private static SocketPath: string = path.join("\\\\?\\pipe", utilHelper.tacoHome, "installer.sock");

        // Map the ids that cordova uses for the dependencies to our own ids
        // TODO (DevDiv 1170232): Use the real ids that cordova uses when the check_reqs feature is done
        private static IdMap: { [cordovaId: string]: string } = {
            "android-sdk": "androidSdk",
            ant: "ant",
            gradle: "gradle",
            "ios-deploy": "iosDeploy",
            "ios-sim": "iosSim",
            java: "javaJdk",
            msbuild: "msBuild",
        };

        private dependenciesDataWrapper: DependencyDataWrapper;
        private unsupportedMissingDependencies: any[];
        private missingDependencies: DependencyInstallerInterfaces.IDependency[];
        private platform: string;
        
        private socketHandle: NodeJSNet.Socket;
        private serverHandle: NodeJSNet.Server;

        constructor() {
            this.platform = os.platform();
            this.dependenciesDataWrapper = new DependencyDataWrapper();
        }

        public run(data: tacoUtils.Commands.ICommandData): Q.Promise<any> {
            // We currently only support Windows for dependency installation
            // TODO (DevDiv 1172346): Support Mac OS as well
            if (this.platform !== "win32") {
                return Q.reject(errorHelper.get(TacoErrorCodes.UnsupportedPlatform, this.platform));
            }

            // We currently only support installing dependencies for Android
            var targetPlatform: string = data.remain[0];

            if (targetPlatform !== "android") {
                return Q.reject(errorHelper.get(TacoErrorCodes.UnsupportedTargetPlatform, targetPlatform));
            }

            // Call into Cordova to check missing dependencies for the current project
            var cordovaResults: any[] = DependencyInstaller.callCordovaCheckDependencies(data.remain[0]);

            // Extract Cordova results and transform them to an array of dependency ids
            this.parseMissingDependencies(cordovaResults);

            // Warn the user for any dependencies for which installation is not supported
            this.displayUnsupportedWarning();

            // Sort the array of dependency ids based on the order in which they need to be installed
            this.sortDependencies();

            // Print a summary of what is about to be installed, Wait for user confirmation, then spawn the elevated process which will perform the installations
            return this.printDependenciesToInstall()
                .then(this.createServer.bind(this))
                .then(this.connectServer.bind(this))
                .then(this.spawnElevatedInstaller.bind(this))
                .then(this.printSummaryLine.bind(this));
        }

        private static callCordovaCheckDependencies(platform: string): any[] {
            // TODO (DevDiv 1170232): Call Cordova when they have added dependency checking
            // TEMP Example of what cordova cheq_reqs could return
            return [
                {
                    id: "android-sdk",
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
                    id: "java",
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
                    var tacoId: string = DependencyInstaller.IdMap[value.id];
                    var versionToUse: string = value.metadata && value.metadata.version ? value.metadata.version : self.dependenciesDataWrapper.firstValidVersion(tacoId);
                    var installPath: string = path.resolve(installerUtils.expandPath(self.dependenciesDataWrapper.getInstallDirectory(tacoId, versionToUse)));
                    var dependencyInfo: DependencyInstallerInterfaces.IDependency = {
                        id: tacoId,
                        version: versionToUse,
                        displayName: self.dependenciesDataWrapper.getDisplayName(tacoId),
                        licenseUrl: self.dependenciesDataWrapper.getLicenseUrl(tacoId),
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

            // If the id is not in our id map, we don't support this dependency
            var tacoId: string = DependencyInstaller.IdMap[cordovaDependencyResult.id];

            if (!tacoId) {
                return false;
            }

            // If cordova is requesting a specific version we need additional verifications
            var requestedVersion: string = cordovaDependencyResult.metadata ? cordovaDependencyResult.metadata.version : null;

            if (requestedVersion) {
                // If we don't have the requested version in the installers for this dependency in our metadata, we don't support this dependency
                if (!this.dependenciesDataWrapper.versionExists(tacoId, requestedVersion)) {
                    return false;
                }

                // If we don't have an appropriate installer for the user's platform for the requested version, we don't support this dependency
                if (!this.dependenciesDataWrapper.isSystemSupported(tacoId, requestedVersion)) {
                    return false;
                }

                // If we reach this line, it means we support this dependency
                return true;
            } else {
                // Cordova did not request a specific version, so look if we have at least one installer version that supports the user's platform
                if (this.dependenciesDataWrapper.firstValidVersion(tacoId)) {
                    return true;
                }

                // If we reach this line, it means we don't have a suitable installer for the user's platform for this dependency
                return false;
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
            /*var self = this;

            this.missingDependencies.sort(function (a: IDependencyInfo, b: IDependencyInfo): number {
                var aDependsOnB: boolean = self.dependenciesDataWrapper.dependsOn(a.id, b.id);
                var bDependsOnA: boolean = self.dependenciesDataWrapper.dependsOn(b.id, a.id);

                if (aDependsOnB && bDependsOnA) {
                    throw errorHelper.get(TacoErrorCodes.NoValidInstallOrder);
                }

                if (bDependsOnA) {
                    return -1;
                }

                if (aDependsOnB) {
                    return 1;
                }

                return 0;
            });*/

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

        private printDependenciesToInstall(): Q.Promise<any> {
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
                            case installerProtocol.DataType.Output:
                                self.printOutput(parsedData.message);
                                break;
                            case installerProtocol.DataType.Success:
                                self.printSuccess(parsedData.message);
                                break;
                            case installerProtocol.DataType.Bold:
                                self.printBold(parsedData.message);
                                break;
                            case installerProtocol.DataType.Warn:
                                self.printWarning(parsedData.message);
                                break;
                            case installerProtocol.DataType.Error:
                                self.printError(parsedData.message);
                                break;
                            case installerProtocol.DataType.Prompt:
                                self.promptUser(parsedData.message);
                                break;
                        }
                    });
                });
            });
        }

        private printOutput(msg: string): void {
            logger.logNormalLine(msg);
        }

        private printSuccess(msg: string): void {
            logger.logSuccessLine(msg);
        }

        private printBold(msg: string): void {
            logger.log("\n");
            logger.logNormalBoldLine(msg);
        }

        private printWarning(msg: string): void {
            logger.logWarnLine(msg);
        }

        private printError(msg: string): void {
            logger.logErrorLine(msg);
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

            switch (this.platform) {
                case "win32":
                    return this.spawnElevatedInstallerWin32();
                default:
                    return Q.reject<number>(errorHelper.get(TacoErrorCodes.UnsupportedPlatform, this.platform));
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
                case installerProtocol.ExitCode.CompletedWithErrors:
                    logger.logErrorLine(resources.getString("InstallCompletedWithErrors"));
                    break;
                case installerProtocol.ExitCode.CouldNotConnect:
                    throw errorHelper.get(TacoErrorCodes.CouldNotConnect);
                    break;
                case installerProtocol.ExitCode.NoAdminRights:
                    throw errorHelper.get(TacoErrorCodes.NoAdminRights);
                    break;
                case installerProtocol.ExitCode.Success:
                    logger.logSuccessLine(resources.getString("InstallCompletedSuccessfully"));
                    break;
                default:
                    throw errorHelper.get(TacoErrorCodes.UnknownExitCode);
                    break;
            }
        }
    }
}

export = TacoDependencyInstaller;