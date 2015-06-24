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

import InstallerRunner = require ("../installerRunner");

import IDependency = DependencyInstallerInterfaces.IDependency;

describe("DependencyInstaller", function (): void {
    // Important paths
    var runFolder: string = path.resolve(os.tmpdir(), "taco_dependency_installer_test_run");
    var tacoHome: string = path.join(runFolder, "taco_home");
    var installConfigFile: string = path.join(tacoHome, "installConfig.json");
    var testMetadataFile: string = path.resolve(__dirname, "test-data", "testMetadata.json");

    // Persistent installer runner instance
    var installerRunner: InstallerRunner;

    // Utility functions
    function createBuildConfig(dependencies: IDependency[]) {
        if (fs.existsSync(installConfigFile)) {
            fs.unlinkSync(installConfigFile);
        }

        var jsonWrapper: any = {
            dependencies: dependencies
        };

        wrench.mkdirSyncRecursive(path.dirname(installConfigFile), 511); // 511 decimal is 0777 octal
        fs.writeFileSync(installConfigFile, JSON.stringify(jsonWrapper, null, 4));
    }

    function verifyDependencyArray(expectedIds: string[], actualDependencies: IDependency[]): void {
        expectedIds.length.should.be.exactly(actualDependencies.length);

        expectedIds.forEach(function (id: string): void {
            var expectedDepFound: boolean = actualDependencies.some(function (missingDep: IDependency): boolean {
                return missingDep.id === id;
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
        installerRunner = new InstallerRunner(installConfigFile, null, testMetadataFile);

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

    describe("parseInstallConfig()", function (): void {
        beforeEach(function (): void {
            if (fs.existsSync(installConfigFile)) {
                fs.unlinkSync(installConfigFile);
            }
        });

        it("should parse without errors a valid installConfig file", function (): void {
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
                    installDestination: "test_value7",
                    licenseUrl: "test_value7"
                }
            ];

            createBuildConfig(missingDependencies);
            (<any>installerRunner).parseInstallConfig();
        });

        it("should report the correct error when installConfig does not exist", function (): void {
            try {
                (<any>installerRunner).parseInstallConfig();
            } catch (err) {
                err.message.should.be.exactly("InstallConfigNotFound");
            }
        });

        it("should report the correct error when installConfig is malformed", function (): void {
            wrench.mkdirSyncRecursive(path.dirname(installConfigFile), 511); // 511 decimal is 0777 octal

            // Case where the file does not contain a valid JSON object
            fs.writeFileSync(installConfigFile, "{\"dependencies\":");

            try {
                (<any>installerRunner).parseInstallConfig();
            } catch (err) {
                err.message.should.be.exactly("InstallConfigMalformed");
            }

            // Case where the file does not have a dependencies node
            fs.writeFileSync(installConfigFile, "{\"unknownObject\":\"unknownValue\"}");

            try {
                (<any>installerRunner).parseInstallConfig();
            } catch (err) {
                err.message.should.be.exactly("InstallConfigMalformed");
            }
        });

        it("should report the correct error when installConfig contains an unknown ID", function (): void {
            var missingDependencies: IDependency[] = [
                {
                    id: "dependency1",
                    version: "1.0",
                    displayName: "test_value1",
                    installDestination: "test_value1"
                },
                {
                    id: "unknownDependency",
                    version: "1.0",
                    displayName: "test_value5",
                    installDestination: "test_value5"
                },
                {
                    id: "dependency7",
                    version: "1.0",
                    displayName: "test_value7",
                    installDestination: "test_value7",
                    licenseUrl: "test_value7"
                }
            ];

            try {
                (<any>installerRunner).parseInstallConfig();
            } catch (err) {
                err.message.should.be.exactly("UnknownDependency");
            }
        });

        it("should report the correct error when installConfig contains an unknown version ID", function (): void {
            var missingDependencies: IDependency[] = [
                {
                    id: "dependency1",
                    version: "1.0",
                    displayName: "test_value1",
                    installDestination: "test_value1"
                },
                {
                    id: "dependency5",
                    version: "unknown",
                    displayName: "test_value5",
                    installDestination: "test_value5"
                },
                {
                    id: "dependency7",
                    version: "1.0",
                    displayName: "test_value7",
                    installDestination: "test_value7",
                    licenseUrl: "test_value7"
                }
            ];

            try {
                (<any>installerRunner).parseInstallConfig();
            } catch (err) {
                err.message.should.be.exactly("UnknownVersion");
            }
        });

        it("should report the correct error when installConfig contains an invalid install path", function (): void {
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
                    installDestination: "\\\\//::::****>>><<<<\"\""
                },
                {
                    id: "dependency7",
                    version: "1.0",
                    displayName: "test_value7",
                    installDestination: "test_value7",
                    licenseUrl: "test_value7"
                }
            ];

            try {
                (<any>installerRunner).parseInstallConfig();
            } catch (err) {
                err.message.should.be.exactly("UnknownVersion");
            }
        });
    });

    describe("instantiateInstaller()", function (): void {
    });
});