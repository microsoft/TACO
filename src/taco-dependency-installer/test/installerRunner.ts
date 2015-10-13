/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../../typings/dependencyInstallerInterfaces.d.ts" />
/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/rimraf.d.ts"/>
/// <reference path="../../typings/should.d.ts"/>

"use strict";

/* tslint:disable:no-var-requires */
// var require needed for should module to work correctly
// Note not import: We don't want to refer to shouldModule, but we need the require to occur since it modifies the prototype of Object.
var shouldModule: any = require("should");
/* tslint:enable:no-var-requires */

import fs = require ("fs");
import os = require ("os");
import path = require ("path");
import rimraf = require ("rimraf");
import wrench = require ("wrench");
import tacoUtils = require ("taco-utils");

import InstallerRunner = require ("../installerRunner");

import IDependency = DependencyInstallerInterfaces.IDependency;
import TelemetryGenerator = tacoUtils.TelemetryGenerator;

describe("InstallerRunner", function (): void {
    // Important paths
    var runFolder: string = path.resolve(os.tmpdir(), "taco_dependency_installer_test_run");
    var tacoHome: string = path.join(runFolder, "taco_home");
    var installConfigFile: string = path.join(tacoHome, "installConfig.json");
    var testMetadataFile: string = path.resolve(__dirname, "test-data", "testMetadata.json");

    // Persistent installer runner instance
    var installerRunner: InstallerRunner;

    // Utility functions
    function createBuildConfig(dependencies: IDependency[]): void {
        if (fs.existsSync(installConfigFile)) {
            fs.unlinkSync(installConfigFile);
        }

        var jsonWrapper: DependencyInstallerInterfaces.IInstallerConfig = {
            dependencies: dependencies
        };

        wrench.mkdirSyncRecursive(path.dirname(installConfigFile), 511); // 511 decimal is 0777 octal
        fs.writeFileSync(installConfigFile, JSON.stringify(jsonWrapper, null, 4));
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
            (<any> installerRunner).parseInstallConfig(new TelemetryGenerator(""));
        });

        it("should report the correct error when installConfig does not exist", function (): void {
            try {
                (<any> installerRunner).parseInstallConfig(new TelemetryGenerator(""));
            } catch (err) {
                err.message.should.be.exactly("InstallConfigNotFound");
            }
        });

        it("should report the correct error when installConfig is malformed", function (): void {
            wrench.mkdirSyncRecursive(path.dirname(installConfigFile), 511); // 511 decimal is 0777 octal

            // Case where the file does not contain a valid JSON object
            fs.writeFileSync(installConfigFile, "{\"dependencies\":");

            try {
                (<any> installerRunner).parseInstallConfig(new TelemetryGenerator(""));
            } catch (err) {
                err.message.should.be.exactly("InstallConfigMalformed");
            }

            // Case where the file does not have a dependencies node
            fs.writeFileSync(installConfigFile, "{\"unknownObject\":\"unknownValue\"}");

            try {
                (<any> installerRunner).parseInstallConfig(new TelemetryGenerator(""));
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

            createBuildConfig(missingDependencies);

            try {
                (<any> installerRunner).parseInstallConfig(new TelemetryGenerator(""));
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

            createBuildConfig(missingDependencies);

            try {
                (<any> installerRunner).parseInstallConfig(new TelemetryGenerator(""));
            } catch (err) {
                err.message.should.be.exactly("UnknownVersion");
            }
        });

        (os.platform() === "win32" ? it : it.skip)("should report the correct error when installConfig contains an invalid install path", function (): void {
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
                    installDestination: "\\\\//::::****>>><<<<\"\"my\\folder"
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

            try {
                (<any> installerRunner).parseInstallConfig(new TelemetryGenerator(""));
            } catch (err) {
                err.message.should.be.exactly("InvalidInstallPath");
            }
        });

        it("should report the correct error when installConfig contains a non-empty install path", function (): void {
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
                    installDestination: runFolder
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

            try {
                (<any> installerRunner).parseInstallConfig(new TelemetryGenerator(""));
            } catch (err) {
                err.message.should.be.exactly("PathNotEmpty");
            }
        });

        it("should report the correct error when installConfig contains duplicate install paths", function (): void {
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
                    installDestination: "test_value7"
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

            try {
                (<any> installerRunner).parseInstallConfig(new TelemetryGenerator(""));
            } catch (err) {
                err.message.should.be.exactly("PathNotUnique");
            }
        });
    });

    describe("instantiateInstaller()", function (): void {
        it("should instantiate a sub-installer without error", function (): void {
            var dependency: IDependency = {
                id: "dependency1",
                version: "1.0",
                displayName: "test_value1",
                installDestination: "test_value1"
            };

            (<any> installerRunner).instantiateInstaller(dependency);
        });
    });
});
