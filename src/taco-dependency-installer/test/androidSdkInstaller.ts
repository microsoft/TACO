/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../../typings/dependencyInstallerInterfaces.d.ts"/>
/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/mockery.d.ts"/>
/// <reference path="../../typings/should.d.ts"/>

"use strict";

/* tslint:disable:no-var-requires */
// var require needed for should module to work correctly
// Note not import: We don't want to refer to shouldModule, but we need the require to occur since it modifies the prototype of Object.
var shouldModule = require("should");
/* tslint:enable:no-var-requires */

import installerProtocol = require("../elevatedInstallerProtocol");
import ILogger = installerProtocol.ILogger;
import mockery = require("mockery");
import Q = require("q");
import tacoTestsUtils = require("taco-tests-utils");
import tacoUtils = require("taco-utils");
import _ = require("lodash");

import nodeFakes = tacoTestsUtils.NodeFakes;

type TelemetryEvent = TacoUtility.ICommandTelemetryProperties;

class FakeLogger implements ILogger {
    public log(message: string): void {
        // TODO: Store all messages in memory, so we can test them
    }

    public logWarning(message: string): void {
        // TODO: Store all messages in memory, so we can test them
    }

    public logError(message: string): void {
        // TODO: Store all messages in memory, so we can test them
    }

    public promptForEnvVariableOverwrite(message: string): Q.Promise<any> {
        return Q({});
    }
}

describe("AndroidSdkInstaller telemetry", () => {
    tacoUtils.Telemetry.init("TACO/dependencyInstaller", "1.2.3", false);

    var originalProcess = process;

    before(() => {
        // We tell mockery to replace "require()" with our own custom mock objects
        mockery.enable({ warnOnUnregistered: false });
    });

    after(() => {
        // Clean up and revert everything back to normal
        process = originalProcess;
        mockery.deregisterAll();
        mockery.disable();
    });

    describe("updateVariablesDarwin", () => {
        it("generates telemetry if there is an error on the update command", (done: MochaDone) => {
            // Register mocks. child_process and taco-utils mocks needs to be register before 
            // AndroidSdkInstaller is required for the mock to work
            mockery.registerMock("child_process", new nodeFakes.ChildProcessModule().fakeAllExecCallsEndingWithErrors());

            var fakeTelemetryHelper: TacoTestsUtils.TelemetryFakes.Helper = new tacoTestsUtils.TelemetryFakes.Helper();
            var tacoUtilsWithFakeTelemetry = _.extend({}, tacoUtils, { TelemetryHelper: fakeTelemetryHelper, HasFakes: true });
            mockery.registerMock("taco-utils", tacoUtilsWithFakeTelemetry);

            // We require the AndroidSdkInstaller file, which will use all the mocked dependencies
            var androidSdkInstallerClass = require("../installers/androidSdkInstaller");

            // Mocking process messes with node.js, so we do it after requiring all the files
            var fakeProcess = new nodeFakes.Process().fakeMacOS().fakeDeterministicHrtime().asProcess();
            // TODO: Try to find a nicer way of doing this. Maybe setting process as protoype of FakeProcess?
            process = <any> _.extend({}, process, fakeProcess);

            var steps: DependencyInstallerInterfaces.IStepsDeclaration = {
                download: false,
                install: false,
                updateVariables: true, // We only test this step on this test
                postInstall: false
            };

            var installerInfo: DependencyInstallerInterfaces.IInstallerData = {
                installSource: "",
                sha1: "",
                bytes: 0,
                installDestination: "",
                steps: steps
            };

            var softwareVersion: string = "";
            var installTo: string = "";

            var androidSdkInstaller = new androidSdkInstallerClass(installerInfo, softwareVersion, installTo,
                new FakeLogger(), steps);

            var expectedTelemetry = [
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

            androidSdkInstaller.run()
                .done(() => done(new Error("Should have gotten a rejection in this test")), () => {
                    fakeTelemetryHelper.getAllSentEvents().done((allSentEvents: TelemetryEvent[]) => {
                        allSentEvents.should.eql(expectedTelemetry);
                        done();
                    });
                });
        });
    });
});
