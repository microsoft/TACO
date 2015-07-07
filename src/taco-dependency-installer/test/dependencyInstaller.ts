/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../../typings/dependencyInstallerInterfaces.d.ts" />
/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/should.d.ts"/>

"use strict";

var should_module = require("should"); // Note not import: We don't want to refer to should_module, but we need the require to occur since it modifies the prototype of Object.

import fs = require ("fs");
import os = require ("os");
import path = require ("path");
import rimraf = require ("rimraf");
import wrench = require ("wrench");

import dependencyInstallerModule = require ("../dependencyInstaller");

import DependencyInstaller = dependencyInstallerModule.DependencyInstaller;
import ICordovaRequirement = dependencyInstallerModule.ICordovaRequirement;
import ICordovaRequirementsResult = dependencyInstallerModule.ICordovaRequirementsResult;
import IDependency = DependencyInstallerInterfaces.IDependency;

describe("DependencyInstaller", function (): void {
    // Important paths
    var runFolder: string = path.resolve(os.tmpdir(), "taco_dependency_installer_test_run");
    var tacoHome: string = path.join(runFolder, "taco_home");
    var installConfigFile: string = path.join(tacoHome, "installConfig.json");
    var testMetadataFile: string = path.resolve(__dirname, "test-data", "testMetadata.json");

    // Persistent dependency installer instance
    var dependencyInstaller: DependencyInstaller;

    // Test data
    var mockCordovaReqsRaw: ICordovaRequirementsResult = {
        android: [
            {
                id: "dependency1",
                name: "Dependency 1",
                installed: false
            },
            {
                id: "dependency2",
                name: "Dependency 2",
                installed: false,
                metadata: {
                }
            },
            {
                id: "dependency4",
                name: "Dependency 4",
                installed: false,
                metadata: {
                    version: "3.4.0"
                }
            },
            {
                id: "dependency7",
                name: "Dependency 7",
                installed: true
            },
            {
                id: "unknownDependency",
                name: "Unknown Dependency",
                installed: false
            }
        ],
        windows: [
            {
                id: "dependency3",
                name: "Dependency 3",
                installed: false
            },
            {
                id: "dependency5",
                name: "Dependency 5",
                installed: false
            },
            {
                id: "dependency6",
                name: "Dependency 6",
                installed: false
            }
        ]
    };
    var mockCordovaReqsOutput: string = [
        "Requirements check results for android:",
        "dependency1: not installed",
        "dependency2: not installed",
        "dependency4: not installed",
        "dependency7: installed 1.8.0",
        "unknownDependency: not installed",
        "Requirements check results for windows:",
        "dependency3: not installed",
        "dependency5: not installed",
        "dependency6: not installed",
        "Some of requirements check failed"
    ].join(os.EOL);

    // Utility functions
    function verifyDependencyArray(expectedIds: string[], actualDependencies: IDependency[]): void {
        expectedIds.length.should.be.exactly(actualDependencies.length);

        expectedIds.forEach(function (id: string): void {
            var expectedDepFound: boolean = actualDependencies.some(function (missingDep: IDependency): boolean {
                return missingDep.id === id;
            });

            expectedDepFound.should.be.true;
        });
    }

    function verifyRequirementArray(expectedIds: string[], actualRequirements: ICordovaRequirement[]): void {
        expectedIds.length.should.be.exactly(actualRequirements.length);

        expectedIds.forEach(function (id: string): void {
            var expectedDepFound: boolean = actualRequirements.some(function (req: ICordovaRequirement): boolean {
                return req.id === id;
            });

            expectedDepFound.should.be.true;
        });
    }

    before(function (done: MochaDone): void {
        // Set ResourcesManager to test mode
        process.env["TACO_UNIT_TEST"] = true;

        // Set a temporary location for taco_home
        process.env["TACO_HOME"] = tacoHome;

        // Instantiate the persistent DependencyInstaller
        dependencyInstaller = new DependencyInstaller(testMetadataFile);

        // Delete existing run folder if necessary
        rimraf(runFolder, function (err: Error): void {
            if (err) {
                done(err);
            } else {
                // Create the run folder for our tests
                wrench.mkdirSyncRecursive(runFolder, 511); // 511 decimal is 0777 octal
                done();
            }
        });
    });

    after(function (done: MochaDone): void {
        // Clean up run folder
        rimraf(runFolder, done);
    });

    describe("parseMissingDependencies()", function (): void {
        beforeEach(function (): void {
            (<any>dependencyInstaller).missingDependencies = [];
            (<any>dependencyInstaller).unsupportedMissingDependencies = [];
        });

        it("should correctly parse missing and unsupported dependencies, in taco projects", function (): void {
            var expectedMissingDependencies: string[] = [
                "dependency1",
                "dependency5",
            ];
            var expectedUnsupportedDependencies: string[] = [
                "dependency4",
                "dependency6",
                "unknownDependency"
            ];

            (<any>dependencyInstaller).parseMissingDependencies(mockCordovaReqsRaw);

            var missingDependencies: IDependency[] = (<any>dependencyInstaller).missingDependencies;
            var unsupportedDependencies: ICordovaRequirement[] = (<any>dependencyInstaller).unsupportedMissingDependencies;

            verifyDependencyArray(expectedMissingDependencies, missingDependencies);
            verifyRequirementArray(expectedUnsupportedDependencies, unsupportedDependencies);
        });

        it("should correctly parse missing and unsupported dependencies, in non-taco projects", function (): void {
            var expectedMissingDependencies: string[] = [
                "dependency1",
                "dependency5",
            ];
            var expectedUnsupportedDependencies: string[] = [
                "dependency4",
                "dependency6",
                "unknownDependency"
            ];

            (<any>dependencyInstaller).parseMissingDependencies(mockCordovaReqsOutput);

            var missingDependencies: IDependency[] = (<any>dependencyInstaller).missingDependencies;
            var unsupportedDependencies: ICordovaRequirement[] = (<any>dependencyInstaller).unsupportedMissingDependencies;

            verifyDependencyArray(expectedMissingDependencies, missingDependencies);
            verifyRequirementArray(expectedUnsupportedDependencies, unsupportedDependencies);
        });
    });

    describe("parseFromString()", function (): void {
        it("should correctly parse the cordova requirements results from the string output", function (): void {
            var expectedDependencies: string[] = [
                "dependency1",
                "dependency2",
                "dependency3",
                "dependency4",
                "dependency5",
                "dependency6",
                "unknownDependency"
            ];

            var parsedRequirements: ICordovaRequirement[] = (<any>dependencyInstaller).parseFromString(mockCordovaReqsOutput);

            verifyRequirementArray(expectedDependencies, parsedRequirements);
        });
    });

    describe("parseFromRawResult()", function (): void {
        it("should correctly parse the cordova requirements results returned by the raw api call", function (): void {
            var expectedDependencies: string[] = [
                "dependency1",
                "dependency2",
                "dependency3",
                "dependency4",
                "dependency5",
                "dependency6",
                "unknownDependency"
            ];

            var parsedRequirements: ICordovaRequirement[] = (<any>dependencyInstaller).parseFromRawResult(mockCordovaReqsRaw);

            verifyRequirementArray(expectedDependencies, parsedRequirements);
        });
    });

    describe("sortDependencies()", function (): void {
        it("should correctly sort the missing dependencies according to their prerequisites", function (): void {
            var expectedOrder: string[] = [
                "dependency5",
                "dependency7",
                "dependency1"
            ];

            (<any>dependencyInstaller).missingDependencies = [
                {
                    id: "dependency1",
                    version: "1.0",
                    displayName: "test_value",
                    installDestination: "test_value"
                },
                {
                    id: "dependency5",
                    version: "1.0",
                    displayName: "test_value",
                    installDestination: "test_value"
                },
                {
                    id: "dependency7",
                    version: "1.0",
                    displayName: "test_value",
                    installDestination: "test_value"
                }
            ];

            (<any>dependencyInstaller).sortDependencies();
            (<IDependency[]>(<any>dependencyInstaller).missingDependencies).forEach(function (value: IDependency, index: number): void {
                value.id.should.be.exactly(expectedOrder[index]);
            });
        });

        it("should sort the missing dependencies without error when there's only one dependency", function (): void {
            var expectedOrder: string[] = [
                "dependency1"
            ];

            (<any>dependencyInstaller).missingDependencies = [
                {
                    id: "dependency1",
                    version: "1.0",
                    displayName: "test_value",
                    installDestination: "test_value"
                }
            ];

            (<any>dependencyInstaller).sortDependencies();
            (<IDependency[]>(<any>dependencyInstaller).missingDependencies).forEach(function (value: IDependency, index: number): void {
                value.id.should.be.exactly(expectedOrder[index]);
            });
        });
    });

    describe("canInstallDependency()", function (): void {
        it("should return false for missing id", function (): void {
            var dependency: ICordovaRequirement = {
                id: null,
                installed: false,
                metadata: {
                    version: "1.0"
                },
                name: "test_value"
            };

            var canInstall: boolean = (<any>dependencyInstaller).canInstallDependency(dependency);

            canInstall.should.be.false;
        });

        it("should return false for unknown id", function (): void {
            var dependency: ICordovaRequirement = {
                id: "unknown",
                installed: false,
                metadata: {
                    version: "1.0"
                },
                name: "test_value"
            };

            var canInstall: boolean = (<any>dependencyInstaller).canInstallDependency(dependency);

            canInstall.should.be.false;
        });

        it("should return true for implicit dependencies", function (): void {
            var dependency: ICordovaRequirement = {
                id: "dependency2", // In the test metadata file, dependency 2 is implicit
                installed: false,
                metadata: {
                    version: "1.0"
                },
                name: "test_value"
            };

            var canInstall: boolean = (<any>dependencyInstaller).canInstallDependency(dependency);

            canInstall.should.be.true;
        });

        it("should return false for a requested version that doesn't exist", function (): void {
            var dependency: ICordovaRequirement = {
                id: "dependency1",
                installed: false,
                metadata: {
                    version: "2.1.3" // In the test metadata file, dependency 1 only has a version "1.0"
                },
                name: "test_value"
            };

            var canInstall: boolean = (<any>dependencyInstaller).canInstallDependency(dependency);

            canInstall.should.be.false;
        });

        it("should return false if the requested version exists, but the user's system is not supported", function (): void {
            var dependency: ICordovaRequirement = {
                id: "dependency6",
                installed: false,
                metadata: {
                    version: "1.0" // In the test metadata file, dependency 6 has a version "1.0", but no supported platforms for that version
                },
                name: "test_value"
            };

            var canInstall: boolean = (<any>dependencyInstaller).canInstallDependency(dependency);

            canInstall.should.be.false;
        });

        it("should return true if the requested version exists and the user's system is supported", function (): void {
            var dependency: ICordovaRequirement = {
                id: "dependency1",
                installed: false,
                metadata: {
                    version: "1.0"
                },
                name: "test_value"
            };

            var canInstall: boolean = (<any>dependencyInstaller).canInstallDependency(dependency);

            canInstall.should.be.true;
        });

        it("should return false if no version is requested, but the user's system is not supported", function (): void {
            var dependency: ICordovaRequirement = {
                id: "dependency6", // In the test metadata file, dependency 6 has no supported platforms
                installed: false,
                name: "test_value"
            };

            var canInstall: boolean = (<any>dependencyInstaller).canInstallDependency(dependency);

            canInstall.should.be.false;
        });

        it("should return true if no version is requested and the user's system is supported", function (): void {
            var dependency: ICordovaRequirement = {
                id: "dependency1",
                installed: false,
                name: "test_value"
            };

            var canInstall: boolean = (<any>dependencyInstaller).canInstallDependency(dependency);

            canInstall.should.be.true;
        });
    });

    describe("buildInstallConfigFile()", function (): void {
        var missingDependencies: IDependency[] = [
            {
                id: "dependency1",
                version: "1.0",
                displayName: "test_value1",
                installDestination: "test_value1"
            },
            {
                id: "dependency5",
                version: "1.0",
                displayName: "test_value5",
                installDestination: "test_value5"
            },
            {
                id: "dependency7",
                version: "1.0",
                displayName: "test_value7",
                installDestination: "test_value7"
            }
        ];

        var jsonWrapper: any = {
            dependencies: missingDependencies
        };

        beforeEach(function (): void {
            if (fs.existsSync(installConfigFile)) {
                fs.unlinkSync(installConfigFile);
            }

            (<any>dependencyInstaller).missingDependencies = missingDependencies;
        });
         
        it("should correctly generate the install config file", function (): void {
            (<any>dependencyInstaller).buildInstallConfigFile();
            
            var content: any = require(installConfigFile);

            JSON.stringify(content).should.be.exactly(JSON.stringify(jsonWrapper));
        });

        it("should correctly generate the install config file when one already exists", function (): void {
            var dummyContent: any = {
                test: "test"
            };

            // Write a dummy installConfig file
            wrench.mkdirSyncRecursive(path.dirname(installConfigFile), 511); // 511 decimal is 0777 octal
            fs.writeFileSync(installConfigFile, JSON.stringify(dummyContent, null, 4));

            // Write the real installConfig file
            (<any>dependencyInstaller).buildInstallConfigFile();

            var content: any = require(installConfigFile);

            JSON.stringify(content).should.be.exactly(JSON.stringify(jsonWrapper));
        });
    });
});