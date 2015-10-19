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
/// <reference path="../../typings/telemetryFakes.d.ts"/>

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
import _ = require("lodash");

import nodeFakes = tacoTestsUtils.NodeFakes;

type TelemetryEvent = TacoUtility.ICommandTelemetryProperties;

class FakeLogger implements ILogger {
    public log(message: string): void {
        // Currently we don't care about these messages
    }

    public logWarning(message: string): void {
        // Currently we don't care about these messages
    }

    public logError(message: string): void {
        // Currently we don't care about these messages
    }

    public promptForEnvVariableOverwrite(message: string): Q.Promise<any> {
        return Q({});
    }
}

describe("AndroidSdkInstaller telemetry", () => {
    before(() => {
        // We tell mockery to replace "require()" with our own custom mock objects
        mockery.enable({ useCleanCache: true, warnOnUnregistered: false });
    });

    after(() => {
        // Clean up and revert everything back to normal
        mockery.deregisterAll();
        mockery.disable();
    });

    describe("updateVariablesDarwin", () => {
        it("generates telemetry if there is an error on the update command", (done: MochaDone) => {
            var fakeProcessUtilsModule = {
                ProcessUtils: new nodeFakes.Process().fakeMacOS()
                    .fakeDeterministicHrtime().buildProcessUtils()
            };
            mockery.registerMock("./processUtils", fakeProcessUtilsModule); // TelemetryHelper loads ./processUtils
            var tacoUtils: typeof TacoUtility = require("taco-utils");
            tacoUtils.Telemetry.init("TACO/dependencyInstaller", "1.2.3", false);

            // Register mocks. child_process and taco-utils mocks needs to be register before 
            // AndroidSdkInstaller is required for the mock to work
            mockery.registerMock("child_process", new nodeFakes.ChildProcessModule().fakeAllExecCallsEndingWithErrors());

            // Reload taco-tests-utils but now with the fake processUtils loaded, so the fake telemetry will use the fake process
            var tacoTestsUtilsWithMocks: typeof tacoTestsUtils = require("taco-tests-utils");

            var fakeTelemetryHelper: TacoTestsUtils.TelemetryFakes.Helper = new tacoTestsUtilsWithMocks.TelemetryFakes.Helper();
            var tacoUtilsWithFakes = _.extend({}, tacoUtils, { TelemetryHelper: fakeTelemetryHelper, HasFakes: true },
                fakeProcessUtilsModule);
            mockery.registerMock("taco-utils", tacoUtilsWithFakes); // AndroidSdkInstaller loads taco-utils

            // We require the AndroidSdkInstaller file, which will use all the mocked dependencies
            var androidSdkInstallerClass = require("../installers/androidSdkInstaller");

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

            return androidSdkInstaller.run()
                .then(() => Q.reject(new Error("Should have gotten a rejection in this test")), () => {
                    return fakeTelemetryHelper.getAllSentEvents().then((allSentEvents: TelemetryEvent[]) => {
                        allSentEvents.should.eql(expectedTelemetry);
                    });
                }).done(done, done);
        });
    });
});
