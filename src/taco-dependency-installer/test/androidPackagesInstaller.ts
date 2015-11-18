/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../../typings/dependencyInstallerInterfaces.d.ts"/>
/// <reference path="../../typings/lodash.d.ts"/>
/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/mockery.d.ts"/>
/// <reference path="../../typings/mock-fs.d.ts"/>
/// <reference path="../../typings/nodeFakes.d.ts"/>
/// <reference path="../../typings/should.d.ts"/>
/// <reference path="../../typings/tacoTestsUtils.d.ts"/>
/// <reference path="../../typings/telemetryFakes.d.ts"/>

"use strict";

/* tslint:disable:no-var-requires */
// var require needed for should module to work correctly
// Note not import: We don't want to refer to shouldModule, but we need the require to occur since it modifies the prototype of Object.
var shouldModule = require("should");
/* tslint:enable:no-var-requires */

import installerProtocol = require("../elevatedInstallerProtocol");
import FakeLogger = require("./fakeLogger");
import InstallerBase = require("../installers/installerBase");
import _ = require("lodash");
import mockery = require("mockery");
import mockFs = require("mock-fs");
import path = require("path");
import Q = require("q");
import tacoTestsUtils = require("taco-tests-utils");

import ILogger = installerProtocol.ILogger;

import nodeFakes = tacoTestsUtils.NodeFakes;

type TelemetryEvent = TacoUtility.ICommandTelemetryProperties;

describe("AndroidPackagesInstaller telemetry", () => {
    // Parameters for AndroidSdkInstaller
    var steps: DependencyInstallerInterfaces.IStepsDeclaration;
    var installerInfo: DependencyInstallerInterfaces.IInstallerData = {
        installSource: "",
        sha1: "",
        bytes: 0,
        installDestination: "",
        steps: steps
    };
    var softwareVersion: string = "";
    var installTo: string = "C:\\Program Files (x86)\\Android"; // Default installation directory in windows

    // Mocks used by the tests
    var mockPath: typeof path;
    var fakeTelemetryHelper: TacoTestsUtils.TelemetryFakes.Helper;
    var fakeProcess: nodeFakes.Process;
    var androidPackagesInstallerClass: any;
    var childProcessModule: nodeFakes.ChildProcessModule;

    var androidSdkPackages = `----------
    id: 3 or "sys-img-x86-addon-google_apis-google-23"
    Type: SystemImage
    Desc: System Image x86 with Google APIs.
        Revision 8
    Requires SDK Platform Android API 23
    ----------
    id: 4 or "extra-android-m2repository"
    Type: Extra
    Desc: Android Support Repository, revision 24
    By Android
    Local Maven repository for Support Libraries
           Install path: extras\android\m2repository
    ----------
    id: 5 or "extra-android-support"
    Type: Extra
    Desc: Android Support Library, revision 23.1
    By Android
    Install path: extras\android\support`;

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

        // We require the AndroidPackagesInstaller file, which will use all the mocked dependencies
        androidPackagesInstallerClass = require("../installers/androidPackagesInstaller");
    });

    after(() => {
        // Clean up and revert everything back to normal
        mockery.deregisterAll();
        mockery.disable();
        mockFs.restore();
    });

    beforeEach(() => {
        fakeTelemetryHelper.clear(); // So we'll only get the new events in each scenario
        steps = { download: false, install: false, updateVariables: false, postInstall: false }; // We reset all the steps to false
        fakeProcess.clearEnv(); // Reset environment variables, given that we modify some of them in the tests
    });

    function telemetryGeneratedShouldBe(expectedTelemetry: TacoUtility.ICommandTelemetryProperties[],
        expectedMessagePattern: RegExp, done: MochaDone): Q.Promise<any> {
        var androidPackagesInstaller = new androidPackagesInstallerClass(installerInfo, softwareVersion, installTo, new FakeLogger(), steps);

        return androidPackagesInstaller.run()
            .then(() => Q.reject(new Error("Should have gotten a rejection in this test")), (error: Error) => {
                return fakeTelemetryHelper.getAllSentEvents().then((allSentEvents: TelemetryEvent[]) => {
                    // We check the message first, because some coding defects can make the tests end in unexpected states
                    error.message.should.match(expectedMessagePattern);

                    // Then we validate the telemetry
                    allSentEvents.should.eql(expectedTelemetry);
                });
            }).done(done, done);
    }

    describe("in windows", () => {
        beforeEach(() => {
            fakeProcess.fakeWindows();
            mockPath.delimiter = ";"; // Installer utils uses this, and the path logic breaks in Mac if we don't mock it

            steps.install = true; // We only test this step on this test

            // Set ANDROID_HOME so updateVariables won't try to re-set it
            installTo = "C:\\Program Files (x86)\\Android"; // We don't have an install location
            var androidHomePath = fakeProcess.env.ANDROID_HOME = mockPath.join(installTo, "android-sdk-windows");

            // Set android paths in the PATH so we won't have to add them
            var platformToolsPath = mockPath.join(androidHomePath, "platform-tools");
            var androidToolsPath = mockPath.join(androidHomePath, "tools");
            fakeProcess.env.PATH = platformToolsPath + mockPath.delimiter + androidToolsPath;

            // Create a fake project.properties file
            var projectPropertiesPath = path.join("platforms", "android", "project.properties");

            // Fake resources file
            var baseDirName = path.dirname(__dirname);
            var resourcesPath = path.join(baseDirName, "resources", "en", "resources.json");

            var files: mockFs.Config = {};
            files[projectPropertiesPath] = "target=sys-img-x86-addon-google_apis-google-23";
            files[resourcesPath] = "{}";
            mockFs(files);
        });

        it("reports telemetry when getAvailableAndroidPackages fails emiting error", (done: MochaDone) => {
            var spawnErrorMessage = "The command is not recognized by the system";
            childProcessModule.mockSpawn.setDefault(function (callback: Function): void {
                /* Warning: The "this" in the next line is the one passed by mockSpawn library. For that
                   to work this context needs to be a JavaScript lambda function. Do not convert this to
                   an arrow function, or this will break because of the change in semantics. */
                this.emit("error", new Error(spawnErrorMessage)); // invokes childProcess.on('error')
                setTimeout(() => callback(0), 0); // Then the child process ends with an arbitrary error code of 8
            });

            var expectedTelemetry: TacoUtility.ICommandTelemetryProperties[] = [
                {
                    "initialStep.time": { isPii: false, value: "2000" },
                    step: { isPii: false, value: "initialStep" }
                },
                {
                    "error.description": {
                        isPii: false,
                        value: "ErrorOnChildProcess on getAvailableAndroidPackages"
                    },
                    "install.time": { isPii: false, value: "2000" },
                    lastStepExecuted: { isPii: false, value: "install" },
                    step: { isPii: false, value: "install" },
                    time: { isPii: false, value: "3000" }
                }
            ];

            return telemetryGeneratedShouldBe(expectedTelemetry, new RegExp(spawnErrorMessage), done);
        });

        it("reports telemetry when getAvailableAndroidPackages fails with error code", (done: MochaDone) => {
            childProcessModule.mockSpawn.setDefault(function (callback: Function): void {
                setTimeout(() => callback(8), 0); // Then the child process ends with an arbitrary error code of 8
            });

            var expectedTelemetry: TacoUtility.ICommandTelemetryProperties[] = [
                {
                    "initialStep.time": { isPii: false, value: "2000" },
                    step: { isPii: false, value: "initialStep" }
                },
                {
                    "error.code": { isPii: false, value: "8" },
                    "error.description": {
                        isPii: false,
                        value: "ErrorOnExitOfChildProcess on getAvailableAndroidPackages"
                    },
                    "error.message": { isPii: true, value: "" },
                    "install.time": { isPii: false, value: "2000" },
                    lastStepExecuted: { isPii: false, value: "install" },
                    step: { isPii: false, value: "install" },
                    time: { isPii: false, value: "3000" }
                }
            ];

            return telemetryGeneratedShouldBe(expectedTelemetry, /^$/, done); // We don't have an error message
        });

        it("reports telemetry when killing adb is not recognized as a command", (done: MochaDone) => {
            // First two calls to list and install the android packages will succeed
            childProcessModule.mockSpawn.sequence.add(childProcessModule.mockSpawn.simple(/*exitCode*/ 0, /*stdout*/ androidSdkPackages, /*stderr*/ ""));
            childProcessModule.mockSpawn.sequence.add(childProcessModule.mockSpawn.simple(/*exitCode*/ 0, /*stdout*/ androidSdkPackages, /*stderr*/ ""));

            // Third call to kill adb will fail
            var spawnErrorMessage = "The kill adb command is not recognized by the system";
            childProcessModule.mockSpawn.sequence.add(function (callback: Function): void {
                /* Warning: The "this" in the next line is the one passed by mockSpawn library. For that
                   to work this context needs to be a JavaScript lambda function. Do not convert this to
                   an arrow function, or this will break because of the change in semantics. */
                this.emit("error", new Error(spawnErrorMessage)); // invokes childProcess.on('error')
                setTimeout(() => callback(0), 0); // Then the child process ends with an arbitrary error code of 0
            });

            var expectedTelemetry: TacoUtility.ICommandTelemetryProperties[] = [
                {
                    "initialStep.time": { isPii: false, value: "2000" },
                    step: { isPii: false, value: "initialStep" }
                },
                {
                    "error.description": { isPii: false, value: "ErrorOnKillingAdb in killAdb" },
                    "install.time": { isPii: false, value: "2000" },
                    lastStepExecuted: { isPii: false, value: "install" },
                    step: { isPii: false, value: "install" },
                    time: { isPii: false, value: "3000" }
                }
            ];

            return telemetryGeneratedShouldBe(expectedTelemetry, new RegExp(spawnErrorMessage), done);
        });
    });
});
