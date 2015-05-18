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

import fs = require ("fs");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import readline = require ("readline");

import DependencyDataWrapper = require ("./utils/dependencyDataWrapper");
import DirectedAcyclicGraph = require ("./utils/directedAcyclicGraph");
import InstallerBase = require ("./installers/installerBase");
import installerUtils = require ("./utils/installerUtils");
import resources = require ("./resources/resourceManager");
import tacoUtils = require ("taco-utils");

import logger = tacoUtils.Logger;

interface IDependencyInfo {
    id: string;
    version: string;
    displayName: string;
    licenseUrl?: string;
    installDestination: string;
    installer: InstallerBase;
    error?: Error;
}

module TacoDependencyInstaller {
    export class DependencyInstaller {
        private static DataFile: string = path.resolve(__dirname, "dependencies.json");

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

        // Map the dependency ids to their installer class to easily instantiate the installers
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
        private unsupportedMissingDependencies: any[];
        private missingDependencies: IDependencyInfo[];
        private platform: string;

        constructor() {
            this.platform = os.platform();
            this.dependenciesDataWrapper = new DependencyDataWrapper();
        }

        public run(data: tacoUtils.Commands.ICommandData): Q.Promise<any> {
            // We currently only support Windows for dependency installation
            // TODO (DevDiv 1172346): Support Mac OS as well
            if (this.platform !== "win32") {
                logger.logErrorLine(resources.getString("UnsupportedPlatform", this.platform));

                return Q.reject("UnsupportedPlatform");
            }

            // We currently only support installing dependencies for Android
            var targetPlatform: string = data.remain[0];

            if (targetPlatform !== "android") {
                logger.logErrorLine(resources.getString("UnsupportedTargetPlatform", targetPlatform));

                return Q.reject("UnsupportedTargetPlatform");
            }

            // Call into Cordova to check missing dependencies for the current project
            var cordovaResults: any[] = DependencyInstaller.callCordovaCheckDependencies(data.remain[0]);

            // Extract Cordova results and transform them to an array of dependency ids
            this.parseMissingDependencies(cordovaResults);

            /*
             * Verify if we will need administrator privileges and deal with that accordingly
             * TODO (DevDiv 1173047)
             */

            // Warn the user for any dependencies for which installation is not supported
            this.displayUnsupportedWarning();

            // Sort the array of dependency ids based on the order in which they need to be installed
            this.sortDependencies();

            // Instantiate the installers that will need to be run
            this.instantiateInstallers();

            // Print a summary of what is about to be installed, Wait for user confirmation, then run the insallers in order and print the results
            return this.printDependenciesToInstall()
                .then(this.runInstallers.bind(this))
                .then(this.printResults.bind(this));
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
                    var dependencyInfo: IDependencyInfo = {
                        id: tacoId,
                        version: versionToUse,
                        displayName: self.dependenciesDataWrapper.getDisplayName(tacoId),
                        licenseUrl: self.dependenciesDataWrapper.getLicenseUrl(tacoId),
                        installDestination: installPath,
                        installer: null
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
            var self = this;

            this.missingDependencies.sort(function (a: IDependencyInfo, b: IDependencyInfo): number {
                var aDependsOnB: boolean = self.dependenciesData[a.id].prerequisites[b.id];
                var bDependsOnA: boolean = self.dependenciesData[b.id].prerequisites[a.id]

                if (aDependsOnB && bDependsOnA) {
                    logger.logErrorLine(resources.getString("NoValidInstallOrder"));

                    throw new Error("NoValidInstallOrder");
                }

                if (bDependsOnA) {
                    return -1;
                }

                if (aDependsOnB) {
                    return 1;
                }

                return 0;
            });

            /*
            var self = this;
            var adjacencyList: DirectedAcyclicGraph.IVertexIdentifier[] = [];

            this.missingDependencies.forEach(function (value: IDependencyInfo): void {
                var vertexIdentifier: DirectedAcyclicGraph.IVertexIdentifier = {
                    id: value.id,
                    neighbors: self.dependenciesData[value.id].prerequisites
                };

                adjacencyList.push(vertexIdentifier);
            });

            var graph: DirectedAcyclicGraph = new DirectedAcyclicGraph(adjacencyList);
            var sortedIds: string[] = graph.topologicalSort();
            var sortedDependencies: IDependencyInfo[] = [];

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
            */
        }

        private instantiateInstallers(): void {
            var self = this;

            this.missingDependencies.forEach(function (value: IDependencyInfo, index: number, array: IDependencyInfo[]): void {
                // Instantiate and register the installer
                var installerInfoToUse: DependencyInstallerInterfaces.IInstallerData = self.dependenciesDataWrapper.getInstallerInfo(value.id, value.version);
                var installerConstructor: any = require(DependencyInstaller.InstallerMap[value.id]);

                value.installer = new installerConstructor(installerInfoToUse, value.version, value.installDestination);
            });
        }

        private printDependenciesToInstall(): Q.Promise<any> {
            var needsLicenseAgreement: boolean = this.missingDependencies.some(function (value: IDependencyInfo): boolean {
                // Return true if there is a license url, false if not
                return !!value.licenseUrl;
            });

            logger.logNormalBoldLine(resources.getString("InstallingDependenciesHeader"));
            this.missingDependencies.forEach(function (value: IDependencyInfo, index: number, array: IDependencyInfo[]): void {
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

            if (needsLicenseAgreement) {
                logger.logNormalLine(resources.getString("ProceedLicenseAgreement"));
            } else {
                logger.logNormalLine(resources.getString("Proceed"));
            }

            var deferred: Q.Deferred<any> = Q.defer<any>();
            var rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question(resources.getString("YesExampleString"), function (answer: string): void {
                rl.close();

                if (answer === resources.getString("YesString")) {
                    logger.log("\n");
                    deferred.resolve({});
                } else {
                    logger.logErrorLine(resources.getString("LicenseAgreementError"));
                    deferred.reject("LicenseAgreementError");
                }
            });

            return deferred.promise;
        }

        private runInstallers(): Q.Promise<any> {
            return this.missingDependencies.reduce(function (previous: Q.Promise<any>, value: IDependencyInfo): Q.Promise<any> {
                return previous
                    .then(function (): Q.Promise<any> {
                        logger.logNormalBoldLine(value.displayName);

                        return value.installer.run();
                    })
                    .catch(function (err: Error): void {
                        value.error = err;
                    })
                    .then(function (): void {
                        logger.log("\n");
                    });
            }, Q({}));
        }

        private printResults(): void {
            var dependencyErrors: IDependencyInfo[] = this.missingDependencies.filter(function (value: IDependencyInfo, index: number, array: IDependencyInfo[]): boolean {
                // Return true if there is an error, false otherwise
                return !!value.error;
            });

            if (dependencyErrors.length > 0) {
                logger.logWarnLine(resources.getString("InstallationErrors"));
                dependencyErrors.forEach(function (value: IDependencyInfo, index: number, array: IDependencyInfo[]): void {
                    logger.log(resources.getString("DependencyLabel"));
                    logger.log(value.displayName, logger.Level.NormalBold);
                    logger.log("\n");
                    logger.logErrorLine(value.error.message);
                    logger.log("\n");
                });
            } else {
                logger.logSuccessLine(resources.getString("InstallationSuccessful"));
            }
        }
    }
}

export = TacoDependencyInstaller;