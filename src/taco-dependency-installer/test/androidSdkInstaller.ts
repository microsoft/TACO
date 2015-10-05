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
import nodeFakes = require("../../taco-tests-utils/nodeFakes");
import Q = require("q");
import _ = require("lodash");

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
            // We register our mocks. 1st process mocks, and then taco utils modules that require the process mocks
            mockery.registerMock("child_process", new nodeFakes.FakeChildProcessModule().fakeAllExecCallsEndingWithErrors());

            var tacoUtils = require("taco-utils"); // This needs to be required after mocking process
            tacoUtils.Telemetry.init("TACO/dependencyInstaller", "1.2.3", false);

            var telemetryTestsHelper = require("../../taco-tests-utils/telemetryTestsHelper");
            var fakeTelemetryHelper = new telemetryTestsHelper.FakeTelemetryHelper();
            var tacoUtilsWithFakeTelemetry = _.extend({}, tacoUtils, { TelemetryHelper: fakeTelemetryHelper, HasFakes: true });
            mockery.registerMock("taco-utils", tacoUtilsWithFakeTelemetry);

            // We require the AndroidSdkInstaller file, which will use all the mocked dependencies
            var androidSdkInstallerClass = require("../installers/androidSdkInstaller");

            var fakeProcess = new nodeFakes.FakeProcess().fakeMacOS().fakeDeterministicHrtime().asProcess();
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
                    fakeTelemetryHelper.getAllEvents().should.eql(expectedTelemetry);
                    done();
                });
        });
    });
});
