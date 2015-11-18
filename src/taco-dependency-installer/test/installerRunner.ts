/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../../typings/dependencyInstallerInterfaces.d.ts" />
/// <reference path="../../typings/lodash.d.ts"/>
/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/mockery.d.ts"/>
/// <reference path="../../typings/mock-fs.d.ts"/>
/// <reference path="../../typings/rimraf.d.ts"/>
/// <reference path="../../typings/should.d.ts"/>
/// <reference path="../../typings/tacoTestsUtils.d.ts"/>

"use strict";

/* tslint:disable:no-var-requires */
// var require needed for should module to work correctly
// Note not import: We don't want to refer to shouldModule, but we need the require to occur since it modifies the prototype of Object.
var shouldModule: any = require("should");
/* tslint:enable:no-var-requires */

import FakeLogger = require("./fakeLogger");
import fs = require("fs");
import InstallerRunner = require("../installerRunner");
import _ = require("lodash");
import mockery = require("mockery");
import mockFs = require("mock-fs");
import os = require("os");
import path = require("path");
import Q = require("q");
import tacoTestsUtils = require("taco-tests-utils");
import tacoUtils = require("taco-utils");
import rimraf = require("rimraf");
import wrench = require("wrench");

import FakeTelemetryGenerator = tacoTestsUtils.TelemetryFakes.Generator;
import IDependency = DependencyInstallerInterfaces.IDependency;
import nodeFakes = tacoTestsUtils.NodeFakes;

type TelemetryEvent = TacoUtility.ICommandTelemetryProperties;

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
        // Restore ResourcesManager
        process.env["TACO_UNIT_TEST"] = false;

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
            var telemetry = new FakeTelemetryGenerator("");
            (<any> installerRunner).parseInstallConfig(telemetry);
            telemetry.getEventsProperties().should.eql([]);
        });

        it("should report the correct error when installConfig does not exist", function (): void {
            try {
                var telemetry = new FakeTelemetryGenerator("");
                (<any> installerRunner).parseInstallConfig(telemetry);
            } catch (err) {
                err.message.should.be.exactly("InstallConfigNotFound");
                telemetry.getEventsProperties().should.eql([]);
            }
        });

        it("should report the correct error when installConfig is malformed", function (): void {
            wrench.mkdirSyncRecursive(path.dirname(installConfigFile), 511); // 511 decimal is 0777 octal

            // Case where the file does not contain a valid JSON object
            fs.writeFileSync(installConfigFile, "{\"dependencies\":");

            var telemetry = new FakeTelemetryGenerator("");
            try {
                (<any> installerRunner).parseInstallConfig(telemetry);
            } catch (err) {
                err.message.should.be.exactly("InstallConfigMalformed");
                telemetry.getEventsProperties().should.eql([]);
            }

            // Case where the file does not have a dependencies node
            fs.writeFileSync(installConfigFile, "{\"unknownObject\":\"unknownValue\"}");

            telemetry = new FakeTelemetryGenerator("");
            try {
                (<any> installerRunner).parseInstallConfig(telemetry);
            } catch (err) {
                err.message.should.be.exactly("InstallConfigMalformed");
                telemetry.getEventsProperties().should.eql([]);
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
                var telemetry = new FakeTelemetryGenerator("");
                (<any> installerRunner).parseInstallConfig(telemetry);
            } catch (err) {
                err.message.should.be.exactly("UnknownDependency");
                telemetry.getEventsProperties().should.eql([]);
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
                var telemetry = new FakeTelemetryGenerator("");
                (<any> installerRunner).parseInstallConfig(telemetry);
            } catch (err) {
                err.message.should.be.exactly("UnknownVersion");
                telemetry.getEventsProperties().should.eql([]);
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
                var telemetry = new FakeTelemetryGenerator("");
                (<any> installerRunner).parseInstallConfig(telemetry);
            } catch (err) {
                err.message.should.be.exactly("InvalidInstallPath");
                telemetry.getEventsProperties().should.eql([]);
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
                var telemetry = new FakeTelemetryGenerator("");
                (<any> installerRunner).parseInstallConfig(telemetry);
            } catch (err) {
                err.message.should.be.exactly("PathNotEmpty");
                telemetry.getEventsProperties().should.eql([]);
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
                var telemetry = new FakeTelemetryGenerator("");
                (<any> installerRunner).parseInstallConfig(telemetry);
            } catch (err) {
                err.message.should.be.exactly("PathNotUnique");
                telemetry.getEventsProperties().should.eql([]);
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

    describe("telemetry", function (): void {
        type InstallConfig = { dependencies: IDependency[] };
        type Metadata = { dependencies: DependencyInstallerInterfaces.IDependencyDictionary };

        // Mocks used by the tests
        var mockPath: typeof path;
        var fakeTelemetryHelper: TacoTestsUtils.TelemetryFakes.Helper;
        var fakeProcess: nodeFakes.Process;
        var androidSdkInstallerClass: any;
        var childProcessModule: nodeFakes.ChildProcessModule;
        var installerRunnerUsingMocks: typeof InstallerRunner;
        var files: mockFs.Config = {};

        // Default values for configuration files
        var validMetadata: { dependencies: DependencyInstallerInterfaces.IDependencyDictionary };
        var validInstallConfig: { dependencies: IDependency[] };

        before(() => {
            // We tell mockery to replace "require()" with our own custom mock objects
            mockery.enable({ useCleanCache: true, warnOnUnregistered: false });

            fakeProcess = new nodeFakes.Process().fakeDeterministicHrtime();

            var fakeProcessUtilsModule = { ProcessUtils: fakeProcess.buildProcessUtils() };

            mockery.registerMock("./processUtils", fakeProcessUtilsModule); // TelemetryHelper loads ./processUtils
            var tacoUtils: typeof TacoUtility = require("taco-utils");
            tacoUtils.Telemetry.init("TACO/dependencyInstaller", "1.2.3", false);

            // Register mocks. child_process and taco-utils mocks needs to be registered before 
            // AndroidSdkInstaller is required for the mocking to work
            childProcessModule = new nodeFakes.ChildProcessModule().fakeAllExecCallsEndingWithErrors();
            mockery.registerMock("child_process", childProcessModule);

            // Reload taco-tests-utils but now with the fake processUtils loaded, so the fake telemetry will use the fake process
            var tacoTestsUtilsWithMocks: typeof tacoTestsUtils = require("taco-tests-utils");

            fakeTelemetryHelper = new tacoTestsUtilsWithMocks.TelemetryFakes.Helper();
            var tacoUtilsWithFakes = _.extend({}, tacoUtils, { TelemetryHelper: fakeTelemetryHelper, HasFakes: true },
                fakeProcessUtilsModule);
            mockery.registerMock("taco-utils", tacoUtilsWithFakes); // AndroidSdkInstaller loads taco-utils

            // We need to mock path if we want to run windows tests on a mac, so it'll use ; as path delimiter
            mockPath = <typeof path> _.extend({}, path);
            mockery.registerMock("path", mockPath); // installerUtils uses path.delimiter, and it breaks the Windows tests on mac if not

            // We require the AndroidSdkInstaller file, which will use all the mocked dependencies
            installerRunnerUsingMocks = require("../installerRunner");
            var dependencies: DependencyInstallerInterfaces.IDependency[] = [{
                id: "AndroidSdk", version: "1.2.3", displayName: "Android SDK",
                installDestination: "C:\\installdir\\"
            }];

            validInstallConfig = { dependencies: dependencies };

            var adroidSdkInstallerPath = "scriptToInstallAndroid.js";
            var metadataDependencies: DependencyInstallerInterfaces.IDependencyDictionary = {
                AndroidSdk: {
                    versions: { "1.2.3": {} },
                    installerPath: adroidSdkInstallerPath
                }
            };

            var baseDirName = path.dirname(__dirname);
            var fullInstallerPath = path.join(baseDirName, adroidSdkInstallerPath);
            var resourcesPath = path.join(baseDirName, "resources", "en", "resources.json");

            validMetadata = { dependencies: metadataDependencies };

            files[fullInstallerPath] = "";
            files[resourcesPath] = JSON.stringify({ InstallConfigMalformed: "InstallConfigMalformed" }); // We use this string resource
            mockery.registerMock(fullInstallerPath, () => { return { run: (): void => { /* Do nothing */} }; });
        });

        after(() => {
            // Clean up and revert everything back to normal
            mockery.deregisterAll();
            mockery.disable();
            mockFs.restore();
        });

        beforeEach(() => {
            fakeTelemetryHelper.clear(); // So we'll only get the new events in each scenario
        });

        function registerMockedConfigurationFiles(installConfig: InstallConfig, metadata: Metadata): void {
            files[installConfigFile] = JSON.stringify(installConfig);
            files[testMetadataFile] = JSON.stringify(metadata);
            mockery.registerMock(installConfigFile, installConfig);
            mockery.registerMock(testMetadataFile, metadata);
            mockFs(files);
        }

        function telemetryGeneratedShouldBe(expectedTelemetry: TacoUtility.ICommandTelemetryProperties[] | TacoUtility.ICommandTelemetryProperties,
            done: MochaDone): void {
            var installerRunnerInstance = new installerRunnerUsingMocks(installConfigFile, new FakeLogger(), testMetadataFile);
            installerRunnerInstance.run()
                .then(() => {
                    return fakeTelemetryHelper.getAllSentEvents().then((allSentEvents: TelemetryEvent[]) => {
                        allSentEvents.should.eql(expectedTelemetry);
                        return null;
                    });
                }).done(() => done(), done);
        }

        it("should generate installDestination null telemetry when a value is null", (done: MochaDone) => {
            registerMockedConfigurationFiles(validInstallConfig, validMetadata);

            var expectedTelemetry: TacoUtility.ICommandTelemetryProperties[] = [
                {
                    "initialStep.time": { isPii: false, value: "2000" },
                    step: { isPii: false, value: "initialStep" }
                },
                {
                    "installDestination.defaultIsNull": { isPii: false, value: "true" },
                    "installDestination.destinationIsNull": { isPii: false, value: "false" },
                    "parseInstallConfig.time": { isPii: false, value: "1000" },
                    step: { isPii: false, value: "parseInstallConfig" }
                },
                {
                    "runInstallers.time": { isPii: false, value: "1000" },
                    step: { isPii: false, value: "runInstallers" }
                },
                {
                    installerErrorFlag: { isPii: false, value: "false" },
                    lastStepExecuted: { isPii: false, value: "runInstallersFinished" },
                    "runInstallersFinished.time": { isPii: false, value: "2000" },
                    step: { isPii: false, value: "runInstallersFinished" },
                    time: { isPii: false, value: "7000" }
                }
            ];

            return telemetryGeneratedShouldBe(expectedTelemetry, done);
        });

        it("should generate catch error telemetry when a configuration file is invalid", (done: MochaDone) => {
            registerMockedConfigurationFiles(<InstallConfig> {}, <Metadata> validMetadata); // We send invalid objects on purpose

            var expectedTelemetry: TacoUtility.ICommandTelemetryProperties[] = [
                {
                    "initialStep.time": { isPii: false, value: "2000" },
                    step: { isPii: false, value: "initialStep" }
                },
                {
                    "parseInstallConfig.time": { isPii: false, value: "1000" },
                    step: { isPii: false, value: "parseInstallConfig" }
                },
                {
                    "catch.time": { isPii: false, value: "2000" },
                    errorMessage: { isPii: false, value: "InstallConfigMalformed" },
                    lastStepExecuted: { isPii: false, value: "catch" },
                    step: { isPii: false, value: "catch" },
                    time: { isPii: false, value: "5000" }
                }
            ];

            return telemetryGeneratedShouldBe(expectedTelemetry, done);
        });
    });
});
