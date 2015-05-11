/// <reference path="../typings/dependencyInstallerInterfaces.d.ts" />
/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/tacoUtils.d.ts" />

"use strict";

import fs = require ("fs");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import readline = require ("readline");

import androidSdkInstaller = require ("./installers/androidSdkInstaller");
import antInstaller = require ("./installers/antInstaller");
import gradleInstaller = require ("./installers/gradleInstaller");
import installerBase = require ("./installerBase");
import iosDeployInstaller = require ("./installers/iosDeployInstaller");
import iosSimInstaller = require ("./installers/iosSimInstaller");
import javaJdkInstaller = require ("./installers/javaJdkInstaller");
import msBuildInstaller = require ("./installers/msBuildInstaller");
import resources = require ("./resources/resourceManager");
import tacoUtils = require ("taco-utils");

import logger = tacoUtils.Logger;

interface IVertex {
    outgoingEdges: number[];
    incomingEdges: number[];
}

interface IDependencyInfo {
    id: string;
    version?: string;
    displayName?: string;
    licenseUrl?: string;
    installer?: installerBase.InstallerBase;
    error?: Error;
}

module TacoDependencyInstaller {
    export class DependencyInstaller {
        private static DataFile: string = path.resolve(__dirname, "dependencies.json");

        // Map the ids that cordova uses for the dependencies to our own ids
        // TODO use the real ids that cordova uses when the check_reqs feature is done
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
        private static InstallerMap: { [dependencyId: string]: any } = {
            androidSdk: androidSdkInstaller.AndroidSdkInstaller,
            ant: antInstaller.AntInstaller,
            gradle: gradleInstaller.GradleInstaller,
            iosDeploy: iosDeployInstaller.IosDeployInstaller,
            iosSim: iosSimInstaller.IosSimInstaller,
            javaJdk: javaJdkInstaller.JavaJdkInstaller,
            msBuild: msBuildInstaller.MsBuildInstaller
        };

        private dependenciesData: DependencyInstallerInterfaces.IDependencyDictionary;
        private unsupportedMissingDependencies: any[];
        private missingDependencies: IDependencyInfo[];
        private platform: string;

        constructor() {
            this.platform = os.platform();
        }

        public run(data: tacoUtils.Commands.ICommandData): Q.Promise<any> {
            // Parse dependencies.json
            this.parseDependenciesData();

            // Call into Cordova to check missing dependencies for the current project
            var cordovaResults: string[] = DependencyInstaller.callCordovaCheckDependencies();

            // Extract Cordova results and transform them to an array of dependency ids
            this.parseMissingDependencies(cordovaResults);

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

        private static callCordovaCheckDependencies(): any[] {
            // TODO Call Cordova when they have added dependency checking
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
                    metadata: {
                        version: "7u55"
                    }
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

        private static removeEdgeFromList(vertex: number, list: number[]): void {
            var vertexIndex: number = list.indexOf(vertex);

            while (vertexIndex !== -1) {
                list.splice(vertexIndex, 1);
                vertexIndex = list.indexOf(vertex);
            }
        }

        private parseDependenciesData(): void {
            this.dependenciesData = JSON.parse(fs.readFileSync(DependencyInstaller.DataFile, "utf8"));
        }

        private parseMissingDependencies(cordovaChecksResult: any[]): void {
            // Initialize arrays
            this.unsupportedMissingDependencies = [];
            this.missingDependencies = [];

            // Process cordova results
            var self = this;

            cordovaChecksResult.forEach(function (value: any, index: number, array: any[]): void {
                if (self.canInstallDependency(value)) {
                    var tacoId: string = DependencyInstaller.IdMap[value.id];
                    var dependencyInfo: IDependencyInfo = {
                        id: tacoId,
                        version: value.metadata ? value.metadata.version : null,
                        displayName: self.dependenciesData[tacoId].displayName,
                        licenseUrl: self.dependenciesData[tacoId].licenseUrl
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
                // Verify that we have the requested version in our metadata
                if (!this.dependenciesData[tacoId].installers[requestedVersion]) {
                    return false;
                }

                // Verify that we have an appropriate installer for the user's platform for the requested version
                var installerInfo: DependencyInstallerInterfaces.IInstallerData = this.dependenciesData[tacoId].installers[requestedVersion];

                if (!installerInfo.installerSource[this.platform] && !installerInfo.installerSource["default"]) {
                    return false;
                }

                // If we reach this line, it means we support this dependency
                return true;
            } else {
                // Cordova did not request a specific version, so look if we have at least one installer version that supports the user's platform
                for (var version in this.dependenciesData[tacoId].installers) {
                    if (this.dependenciesData[tacoId].installers.hasOwnProperty(version)) {
                        var installerInfo: DependencyInstallerInterfaces.IInstallerData = this.dependenciesData[tacoId].installers[version];

                        if (installerInfo.installerSource[this.platform] || installerInfo.installerSource["default"]) {
                            return true;
                        }
                    }
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
                        // We can't print this dependency nicely, skip it
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
            // Perform a topological sort for dependencies based on the order in which they need to be installed
            // Initializations
            var graph: IVertex[] = this.buildDependencyGraph();
            var queue: number[] = [];
            var sortedIndexes: number[] = [];

            // Push all vertices with no outgoing edges to the queue
            for (var i: number = 0; i < graph.length; i++) {
                if (graph[i].outgoingEdges.length === 0) {
                    queue.push(i);
                }
            }

            // Perform the sort
            while (queue.length !== 0) {
                // Dequeue a vertex index
                var currentIndex: number = queue.shift();

                // Add it to the sorted list
                sortedIndexes.push(currentIndex);

                // Remove this vertex from the outgoing lists of all vertices that had it as a successor
                for (var i: number = 0; i < graph[currentIndex].incomingEdges.length; i++) {
                    var updatingVertexIndex: number = graph[currentIndex].incomingEdges[i];
                    var updatingVertex: IVertex = graph[updatingVertexIndex];

                    DependencyInstaller.removeEdgeFromList(currentIndex, updatingVertex.outgoingEdges);

                    // If we removed the last outgoing edge for the updating vertex, it is ready to be sorted, so enqueue it
                    if (updatingVertex.outgoingEdges.length === 0) {
                        queue.push(updatingVertexIndex);
                    }
                }
            }

            // At this point we have the sorted indexes, we only need to reorder the IDependencyInfo elements according to these indexes
            var sortedArray: IDependencyInfo[] = [];

            for (var i: number = 0; i < sortedIndexes.length; i++) {
                var nextIndex: number = sortedIndexes[i];

                sortedArray.push(this.missingDependencies[nextIndex]);
            }

            this.missingDependencies = sortedArray;
        }

        private buildDependencyGraph(): IVertex[] {
            var vertices: IVertex[] = [];
            var dependencies: string[] = [];

            this.missingDependencies.forEach(function (value: IDependencyInfo, index: number, array: IDependencyInfo[]): void {
                dependencies.push(value.id);
            });

            // Build the vertices
            for (var i: number = 0; i < dependencies.length; i++) {
                var currentDependency: string = dependencies[i];

                var vertex: IVertex = {
                    outgoingEdges: [],
                    incomingEdges: []
                };

                // Build the outgoing list for this vertex
                for (var j: number = 0; j < this.dependenciesData[currentDependency].prerequesites.length; j++) {
                    // If the current dependency has a prerequesite that is in the list of the dependencies we need to install, add that prerequesite's index to this vertex's outgoing list
                    var currentPrerequesite: string = this.dependenciesData[currentDependency].prerequesites[j];
                    var prerequesiteIndex: number = dependencies.indexOf(currentPrerequesite);

                    if (prerequesiteIndex !== -1) {
                        vertex.outgoingEdges.push(prerequesiteIndex);
                    }
                }

                // Build the incoming list for this vertex
                for (var j: number = 0; j < dependencies.length; j++) {
                    // If a dependency has a prerequesite on the current dependency, add its index to this vertex's incoming list
                    var potentialDependent: string = dependencies[j];

                    if (this.dependenciesData[potentialDependent] && this.dependenciesData[potentialDependent].prerequesites.indexOf(currentDependency) !== -1) {
                        vertex.incomingEdges.push(j);
                    }
                }

                vertices.push(vertex);
            }

            return vertices;
        }

        private instantiateInstallers(): void {
            var self = this;

            this.missingDependencies.forEach(function (value: IDependencyInfo, index: number, array: IDependencyInfo[]): void {
                var versionToInstall: string = value.version;

                // If no version was requested by cordova, use the first suitable version from our metadata
                if (!versionToInstall) {
                    for (var version in self.dependenciesData[value.id].installers) {
                        if (self.dependenciesData[value.id].installers.hasOwnProperty(version)) {
                            var installerInfo: DependencyInstallerInterfaces.IInstallerData = self.dependenciesData[value.id].installers[version];

                            if (installerInfo.installerSource[self.platform] || installerInfo.installerSource["default"]) {
                                versionToInstall = version;
                                break;
                            }
                        }
                    }
                }

                // Instantiate and register the installer
                var installerInfoToUse: DependencyInstallerInterfaces.IInstallerData = self.dependenciesData[value.id].installers[versionToInstall];
                var licenseUrl: string = self.dependenciesData[value.id].licenseUrl;
                var installerConstructor: any = DependencyInstaller.InstallerMap[value.id];

                value.installer = new installerConstructor(installerInfoToUse, versionToInstall);
            });
        }

        private printDependenciesToInstall(): Q.Promise<any> {
            logger.logNormalBoldLine(resources.getString("InstallingDependenciesHeader"));

            this.missingDependencies.forEach(function (value: IDependencyInfo, index: number, array: IDependencyInfo[]): void {
                logger.log(resources.getString("DependencyLabel"));
                logger.log(value.displayName, logger.Level.NormalBold);
                logger.log("\n");
                logger.logNormalLine(resources.getString("DependencyVersion", value.version));

                if (value.licenseUrl) {
                    logger.log(resources.getString("DependencyLicense"));
                    logger.log(value.licenseUrl, logger.Level.Link);
                    logger.log("\n");
                }

                logger.log("\n");
            });

            logger.log("\n");
            logger.logNormalLine(resources.getString("LicenseAgreement"));

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
            var q = Q<any>({});

            this.missingDependencies.forEach(function (value: IDependencyInfo, index: number, array: IDependencyInfo[]): void {
                q = q.then(function (): Q.Promise<any> {
                    return value.installer.run();
                }).catch(function (err: Error): void {
                    value.error = err;
                });
            });

            return q;
        }

        private printResults(): void {
            var errorFound: boolean = this.missingDependencies.some(function (value: IDependencyInfo, index: number, array: IDependencyInfo[]): boolean {
                // Return true if there is an error, false otherwise
                return !!value.error;
            });

            if (errorFound) {
                logger.logWarnLine(resources.getString("InstallationErrors"));
                this.missingDependencies.forEach(function (value: IDependencyInfo, index: number, array: IDependencyInfo[]): void {
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