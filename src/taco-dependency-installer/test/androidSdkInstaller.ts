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
import _ = require("lodash");
import mockery = require("mockery");
import mockFs = require("mock-fs");
import path = require("path");
import Q = require("q");
import tacoTestsUtils = require("taco-tests-utils");

import ILogger = installerProtocol.ILogger;

import nodeFakes = tacoTestsUtils.NodeFakes;

type TelemetryEvent = TacoUtility.ICommandTelemetryProperties;

describe("AndroidSdkInstaller telemetry", () => {
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
    var androidSdkInstallerClass: any;
    var childProcessModule: nodeFakes.ChildProcessModule;

    before(() => {
        // We tell mockery to replace "require()" with our own custom mock objects
        mockery.enable({ useCleanCache: true, warnOnUnregistered: false });

        fakeProcess = new nodeFakes.Process().fakeDeterministicHrtime();

        var fakeProcessUtilsModule = { ProcessUtils: fakeProcess.buildProcessUtils() };

        mockery.registerMock("./processUtils", fakeProcessUtilsModule); // TelemetryHelper loads ./processUtils
        var tacoUtils: typeof TacoUtility = require("taco-utils");
        tacoUtils.Telemetry.init("TACO/dependencyInstaller", "1.2.3", {isOptedIn: false});

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
        androidSdkInstallerClass = require("../installers/androidSdkInstaller");
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
        var androidSdkInstaller = new androidSdkInstallerClass(installerInfo, softwareVersion, installTo,
            new FakeLogger(), steps);

        return androidSdkInstaller.run()
            .then(() => Q.reject(new Error("Should have gotten a rejection in this test")), (error: Error) => {
                return fakeTelemetryHelper.getAllSentEvents().then((allSentEvents: TelemetryEvent[]) => {
                    // We check the message first, because some coding defects can make the tests end in unexpected states
                    error.message.should.match(expectedMessagePattern);

                    // Then we validate the telemetry
                    allSentEvents.should.eql(expectedTelemetry);
                });
            }).done(done, done);
    }

    describe("updateVariablesDarwin", () => {
        it("generates telemetry if there is an error on the update command", (done: MochaDone) => {
            fakeProcess.fakeMacOS();
            steps.updateVariables = true; // We only test this step on this test

            var expectedTelemetry: TacoUtility.ICommandTelemetryProperties[] = [
                {
                    "initialStep.time": { isPii: false, value: "2000" },
                    step: { isPii: false, value: "initialStep" }
                },
                {
                    "error.description": { isPii: false, value: "ErrorOnChildProcess on updateVariablesDarwin" },
                    lastStepExecuted: { isPii: false, value: "updateVariables" },
                    step: { isPii: false, value: "updateVariables" },
                    time: { isPii: false, value: "3000" },
                    "updateVariables.time": { isPii: false, value: "2000" }
                }
            ];

            return telemetryGeneratedShouldBe(expectedTelemetry, /Error while executing/, done);
        });
    });

    describe("installation", () => {
        it("generates telemetry error if there is no install location", (done: MochaDone) => {
            fakeProcess.fakeMacOS();
            steps.install = true; // We only test this step on this test
            installTo = ""; // We don't have an install location

            var expectedTelemetry: TacoUtility.ICommandTelemetryProperties[] = [
                {
                    "initialStep.time": { isPii: false, value: "2000" },
                    step: { isPii: false, value: "initialStep" }
                },
                {
                    "error.description": { isPii: false, value: "NeedInstallDestination on installDefault" },
                    "install.time": { isPii: false, value: "2000" },
                    lastStepExecuted: { isPii: false, value: "install" },
                    step: { isPii: false, value: "install" },
                    time: { isPii: false, value: "3000" }
                }];

            return telemetryGeneratedShouldBe(expectedTelemetry, /NeedInstallDestination/, done);
        });
    });

    describe("post-installation in mac", () => {
        it("generates telemetry error if we can't give executable permissions to the android executable", (done: MochaDone) => {
            fakeProcess.fakeMacOS();

            steps.postInstall = true; // We only test this step on this test
            steps.updateVariables = true; // We need this step because post-install uses this.androidHomeValue populated in this step

            // child_process.exec will succeed while setting the path, and fail while giving permissions
            childProcessModule.fakeUsingCommandToDetermineResult((command: string) => /export PATH=/.test(command),
                (command: string) => /chmod a\+x/.test(command));

            var filePath = path.join(fakeProcess.env.HOME, ".bash_profile");
            var files: mockFs.Config = {};
            files[filePath] = "";
            mockFs(files);

            var expectedTelemetry: TacoUtility.ICommandTelemetryProperties[] = [
                {
                    "initialStep.time": { isPii: false, value: "2000" },
                    step: { isPii: false, value: "initialStep" }
                },
                {
                    step: { isPii: false, value: "updateVariables" },
                    "updateVariables.time": { isPii: false, value: "1000" }
                },
                {
                    "error.description": {
                        isPii: false,
                        value: "ErrorOnChildProcess on addExecutePermission"
                    },
                    lastStepExecuted: { isPii: false, value: "postInstall" },
                    "postInstall.time": { isPii: false, value: "2000" },
                    step: { isPii: false, value: "postInstall" },
                    time: { isPii: false, value: "5000" }
                }
            ];

            return telemetryGeneratedShouldBe(expectedTelemetry, /Error while executing/g, done);
        });
    });
});
