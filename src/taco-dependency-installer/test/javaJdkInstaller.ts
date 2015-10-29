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
import JavaJdkInstaller = require("../installers/javaJdkInstaller");
import _ = require("lodash");
import mockery = require("mockery");
import path = require("path");
import Q = require("q");
import tacoTestsUtils = require("taco-tests-utils");
import tacoUtils = require("taco-utils");

import ILogger = installerProtocol.ILogger;
import nodeFakes = tacoTestsUtils.NodeFakes;

type TelemetryEvent = TacoUtility.ICommandTelemetryProperties;

describe("JavaJdkInstaller telemetry", () => {
    // Parameters for javaJdkInstaller
    var steps: DependencyInstallerInterfaces.IStepsDeclaration;
    var installerInfo: DependencyInstallerInterfaces.IInstallerData = {
        installSource: "",
        sha1: "",
        bytes: 0,
        installDestination: "",
        steps: steps
    };
    var softwareVersion: string = "";
    var installTo: string;

    // Mocks used by the tests
    var fakeTelemetryHelper: TacoTestsUtils.TelemetryFakes.Helper;
    var fakeProcess: nodeFakes.Process;
    var javaJdkInstallerModule: typeof JavaJdkInstaller;
    var childProcessModule: nodeFakes.ChildProcessModule;

    before(() => {
        // We tell mockery to replace "require()" with our own custom mock objects
        mockery.enable({ useCleanCache: true, warnOnUnregistered: false });

        fakeProcess = new nodeFakes.Process().fakeDeterministicHrtime();

        var fakeProcessUtilsModule = { ProcessUtils: fakeProcess.buildProcessUtils() };
        mockery.registerMock("./processUtils", fakeProcessUtilsModule); // TelemetryHelper and Resources loads ./processUtils
        var tacoUtilsWithFakes: typeof TacoUtility = require("taco-utils"); // Reload taco utils with mocks

        tacoUtilsWithFakes.Telemetry.init("TACO/dependencyInstaller", "1.2.3", false);

        // Register mocks. child_process and taco-utils mocks needs to be registered before 
        // javaJdkInstaller is required for the mocking to work
        childProcessModule = new nodeFakes.ChildProcessModule();
        mockery.registerMock("child_process", childProcessModule);

        // Reload taco-tests-utils but now with the fake processUtils loaded, so the fake telemetry will use the fake process
        var tacoTestsUtilsWithMocks: typeof tacoTestsUtils = require("taco-tests-utils");

        fakeTelemetryHelper = new tacoTestsUtilsWithMocks.TelemetryFakes.Helper();
        tacoUtilsWithFakes = <typeof TacoUtility>_.extend({}, tacoUtilsWithFakes,
            { TelemetryHelper: fakeTelemetryHelper, HasFakes: true }, fakeProcessUtilsModule);
        mockery.registerMock("taco-utils", tacoUtilsWithFakes); // javaJdkInstaller loads taco-utils

        // We require the javaJdkInstaller file, which will use all the mocked dependencies
        javaJdkInstallerModule = require("../installers/javaJdkInstaller");
    });

    after(() => {
        // Clean up and revert everything back to normal
        mockery.deregisterAll();
        mockery.disable();
    });

    beforeEach(() => {
        fakeTelemetryHelper.clear(); // So we'll only get the new events in each scenario
        steps = { download: false, install: false, updateVariables: false, postInstall: false }; // We reset all the steps to false
        installTo = "C:\\Program Files (x86)\\JDK"; // Default installation directory in windows
    });

    function telemetryGeneratedShouldBe(expectedTelemetry: TacoUtility.ICommandTelemetryProperties[],
        expectedMessagePattern: RegExp, done: MochaDone): void {
        var javaJdkInstaller: JavaJdkInstaller = new javaJdkInstallerModule(installerInfo, softwareVersion, installTo,
            new FakeLogger(), steps);

        return javaJdkInstaller.run()
            .then<any>(() => Q.reject(new Error("Should have gotten a rejection in this test")), (error: Error) => {
                return fakeTelemetryHelper.getAllSentEvents().then((allSentEvents: TelemetryEvent[]) => {
                    // We check the message first, because some coding defects can make the tests end in unexpected states
                    error.message.should.match(expectedMessagePattern);

                    // Then we validate the telemetry
                    allSentEvents.should.eql(expectedTelemetry);
                });
            }).done(() => done(), done);
    }

    describe("installation in mac", () => {
        enum ChildProcessExecBehavior {
            PackageInstallerCommandFailsScenario,
            PackageInstallerCommandCantBeRunScenario,
            DetachingDmgFileFailsScenario
        }

        var callTime: number;
        var childProcessExecBehavior: ChildProcessExecBehavior;

        beforeEach(() => {
            fakeProcess.fakeMacOS();
            steps.install = true; // We only test this step on this test
            callTime = 0;
            childProcessExecBehavior = null;
        });

        it("generates telemetry error when attaching the dmg file gives an error", (done: MochaDone) => {
            // child_process.exec call will fail for attach dmg, but succeed for detach dmg
            var timesCalled = 0;
            childProcessModule.exec = (command: string, optionsOrCallback: nodeFakes.ExecSecondArgument,
                callback: nodeFakes.Callback = null): nodeFakes.IChildProcess => {
                var realCallback = <nodeFakes.Callback> (callback || optionsOrCallback);
                if (timesCalled++ === 0) {
                    // This is for the attach call
                    realCallback(new Error("Couldn't attach dmg file"), /*stdout*/ new Buffer("/Volumes/Macintosh HD"), /*stderr*/ new Buffer(""));
                } else {
                    // This is for the detach call
                    realCallback(null, /*stdout*/ new Buffer(""), /*stderr*/ new Buffer(""));
                }
                return new nodeFakes.ChildProcess();
            };

            var expectedTelemetry: TacoUtility.ICommandTelemetryProperties[] = [
                {
                    "initialStep.time": { isPii: false, value: "2000" },
                    step: { isPii: false, value: "initialStep" }
                },
                {
                    "error.description": { isPii: false, value: "ErrorOnChildProcess on attachDmg" },
                    "install.time": { isPii: false, value: "2000" },
                    lastStepExecuted: { isPii: false, value: "install" },
                    step: { isPii: false, value: "install" },
                    time: { isPii: false, value: "3000" }
                }
            ];

            return telemetryGeneratedShouldBe(expectedTelemetry, /Couldn\'t attach dmg file/, done);
        });

        function fakeExecToTestPackageInstallerFailure(command: string, optionsOrCallback: nodeFakes.ExecSecondArgument,
            callback: nodeFakes.Callback = null): nodeFakes.IChildProcess {
            var realCallback = <nodeFakes.Callback> (callback || optionsOrCallback);
            if (callTime === 0) {
                // This is for the attach call
                realCallback(null, /*stdout*/ new Buffer("/Volumes/Macintosh HD"), /*stderr*/ new Buffer(""));
            } else if (callTime === 1) {
                // This is for the install package call
                var couldntRunPackageInstallerError = new Error("Package installer exited with an error");
                switch (childProcessExecBehavior) {
                    case ChildProcessExecBehavior.PackageInstallerCommandFailsScenario:
                        (<any> couldntRunPackageInstallerError).code = 54;
                        break;
                    case ChildProcessExecBehavior.PackageInstallerCommandCantBeRunScenario:
                        break;
                    case ChildProcessExecBehavior.DetachingDmgFileFailsScenario:
                        couldntRunPackageInstallerError = null;
                        break;
                    default:
                        throw new Error("Unexpected value. The test probably forgot to set the childProcessExecBehavior variable");
                }
                realCallback(couldntRunPackageInstallerError, /*stdout*/ new Buffer(""), /*stderr*/ new Buffer(""));
            } else {
                // This is for the detach call
                var error = childProcessExecBehavior === ChildProcessExecBehavior.DetachingDmgFileFailsScenario ?
                    new Error("Detach dmg command failed to execute") : null;
                realCallback(error, /*stdout*/ new Buffer(""), /*stderr*/ new Buffer(""));
            }

            callTime++;
            return new nodeFakes.ChildProcess();
        }

        it("generates telemetry error when the package installer gives an error", (done: MochaDone) => {
            // child_process.exec call will only fail for the install packages call
            childProcessModule.exec = fakeExecToTestPackageInstallerFailure;
            childProcessExecBehavior = ChildProcessExecBehavior.PackageInstallerCommandFailsScenario;

            var expectedTelemetry: TacoUtility.ICommandTelemetryProperties[] = [
                {
                    "initialStep.time": { isPii: false, value: "2000" },
                    step: { isPii: false, value: "initialStep" }
                },
                {
                    "error.code": { isPii: false, value: "54" },
                    "error.description": { isPii: false, value: "InstallerError on installPkg" },
                    "error.message0.code": { isPii: true, value: "54" },
                    "install.time": { isPii: false, value: "2000" },
                    lastStepExecuted: { isPii: false, value: "install" },
                    step: { isPii: false, value: "install" },
                    time: { isPii: false, value: "3000" }
                }
            ];

            return telemetryGeneratedShouldBe(expectedTelemetry, /InstallerError/, done);
        });

        it("generates telemetry error when the package installer can't be run", (done: MochaDone) => {
            // child_process.exec call will only fail for the install packages call
            childProcessModule.exec = fakeExecToTestPackageInstallerFailure;
            childProcessExecBehavior = ChildProcessExecBehavior.PackageInstallerCommandCantBeRunScenario;

            var expectedTelemetry: TacoUtility.ICommandTelemetryProperties[] = [
                {
                    "initialStep.time": { isPii: false, value: "2000" },
                    step: { isPii: false, value: "initialStep" }
                },
                {
                    "error.description": { isPii: false, value: "CouldNotRunInstaller on installPkg" },
                    "error.name": { isPii: false, value: "Error" },
                    "install.time": { isPii: false, value: "2000" },
                    lastStepExecuted: { isPii: false, value: "install" },
                    step: { isPii: false, value: "install" },
                    time: { isPii: false, value: "3000" }
                }
            ];

            return telemetryGeneratedShouldBe(expectedTelemetry, /CouldNotRunInstaller/, done);
        });

        it("generates telemetry error when the detach dmg command fails", (done: MochaDone) => {
            // child_process.exec call will only fail for the install packages call
            childProcessModule.exec = fakeExecToTestPackageInstallerFailure;
            childProcessExecBehavior = ChildProcessExecBehavior.DetachingDmgFileFailsScenario;

            var expectedTelemetry: TacoUtility.ICommandTelemetryProperties[] = [
                {
                    "initialStep.time": { isPii: false, value: "2000" },
                    step: { isPii: false, value: "initialStep" }
                },
                {
                    "error.description": { isPii: false, value: "ErrorOnChildProcess on detachDmg" },
                    "install.time": { isPii: false, value: "2000" },
                    lastStepExecuted: { isPii: false, value: "install" },
                    step: { isPii: false, value: "install" },
                    time: { isPii: false, value: "3000" }
                }
            ];

            return telemetryGeneratedShouldBe(expectedTelemetry, /Detach dmg command failed to execute/, done);
        });
    });

    describe("installation in windows", () => {
        beforeEach(() => {
            fakeProcess.fakeWindows();
            steps.install = true; // We only test this step on this test
        });

        it("generates telemetry error if there is no install location", (done: MochaDone) => {
            installTo = ""; // We don't have an install location

            var expectedTelemetry: TacoUtility.ICommandTelemetryProperties[] = [
                {
                    "initialStep.time": { isPii: false, value: "2000" },
                    step: { isPii: false, value: "initialStep" }
                },
                {
                    "error.description": {
                        isPii: false,
                        value: "InstallDestination needed on installWin32"
                    },
                    "install.time": { isPii: false, value: "2000" },
                    lastStepExecuted: { isPii: false, value: "install" },
                    step: { isPii: false, value: "install" },
                    time: { isPii: false, value: "3000" }
                }
            ];

            return telemetryGeneratedShouldBe(expectedTelemetry, /NeedInstallDestination/, done);
        });

        it("generates telemetry if the installer ends with an error", (done: MochaDone) => {
            // child_process.exec call will fail with an error with a code
            var spawnErrorMessage = "The installer ended with an error";
            var couldntRunInstallerError = new Error(spawnErrorMessage);
            (<any> couldntRunInstallerError).code = 23;
            childProcessModule.fakeAllExecCallsEndingWithError(couldntRunInstallerError);

            var expectedTelemetry: TacoUtility.ICommandTelemetryProperties[] = [
                {
                    "initialStep.time": { isPii: false, value: "2000" },
                    step: { isPii: false, value: "initialStep" }
                },
                {
                    "error.code": { isPii: false, value: "23" },
                    "error.description": { isPii: false, value: "InstallerError on installWin32" },
                    "error.message0.code": { isPii: true, value: "23" },
                    "install.time": { isPii: false, value: "2000" },
                    lastStepExecuted: { isPii: false, value: "install" },
                    step: { isPii: false, value: "install" },
                    time: { isPii: false, value: "3000" }
                }
            ];

            return telemetryGeneratedShouldBe(expectedTelemetry, /InstallerError/, done);
        });

        it("generates telemetry if the installer can't be run", (done: MochaDone) => {
            // child_process.exec call will fail
            childProcessModule.fakeAllExecCallsEndingWithErrors();

            var expectedTelemetry: TacoUtility.ICommandTelemetryProperties[] = [
                {
                    "initialStep.time": { isPii: false, value: "2000" },
                    step: { isPii: false, value: "initialStep" }
                },
                {
                    "error.description": { isPii: false, value: "CouldNotRunInstaller on installWin32" },
                    "error.name": { isPii: false, value: "Error" },
                    "install.time": { isPii: false, value: "2000" },
                    lastStepExecuted: { isPii: false, value: "install" },
                    step: { isPii: false, value: "install" },
                    time: { isPii: false, value: "3000" }
                }
            ];

            return telemetryGeneratedShouldBe(expectedTelemetry, /CouldNotRunInstaller/, done);
        });
    });
});
