/**
 ﻿ *******************************************************
 ﻿ *                                                     *
 ﻿ *   Copyright (C) Microsoft. All rights reserved.     *
 ﻿ *                                                     *
 ﻿ *******************************************************
 ﻿ */

/// <reference path="../../typings/should.d.ts"/>
/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/mockery.d.ts"/>
/// <reference path="../../typings/tacoUtils.d.ts"/>

"use strict";

/* tslint:disable:no-var-requires */
// var require needed for should module to work correctly
// Note not import: We don't want to refer to shouldModule, but we need the require to occur since it modifies the prototype of Object.
var shouldModule: any = require("should");
/* tslint:enable:no-var-requires */

import CommandHelper = require("./utils/commandHelper");
import mockery = require("mockery");
import Q = require("q");
import Settings = require("../cli/utils/settings");
import TacoErrorCodes = require("../cli/tacoErrorCodes");
import tacoUtils = require("taco-utils");

import ICommand = tacoUtils.Commands.ICommand;
import TacoError = tacoUtils.TacoError;

describe("taco simulate", () => {
    var unknownPlatformErrorMsg: string = "Unknown platform";

    before(() => {
        mockery.enable({useCleanCache: true, warnOnUnregistered: false});
        mockery.registerMock("taco-simulate", (opts: any) => {
            return opts.platform === "unknown" ? Q.reject(unknownPlatformErrorMsg) : Q(null);
        });
    });

    after(() => {
        mockery.deregisterAll();
        mockery.disable();
    });

    describe("failure scenarios", () => {
        function runSimulateFailureScenario(args: string[], expectedErrorNumber: TacoErrorCodes, done: MochaDone): void {
            var simulate: ICommand = CommandHelper.getCommand("simulate");
            var commandData: tacoUtils.Commands.ICommandData = {
                options: {},
                original: args,
                remain: args.slice()
            };
            simulate.run(commandData).then((telemetryParameters: tacoUtils.ICommandTelemetryProperties) => {
                throw new Error("Scenario succeeded when it should have failed");
            }, function (error: TacoError): void {
                error.errorCode.should.equal(expectedErrorNumber);
            }).done(() => done(), done);
        }

        it("returns an error when taco-simulate returns an error", function (done: MochaDone): void {
            runSimulateFailureScenario(["unknown"], TacoErrorCodes.CommandSimulateUnknownError, done);
        });
    });

    describe("telemetry properties", () => {
        function runSimulateAndVerifyTelemetryProps(args: string[], expectedProperties: tacoUtils.ICommandTelemetryProperties, done: MochaDone): void {
            var simulate: ICommand = CommandHelper.getCommand("simulate");
            var commandData: tacoUtils.Commands.ICommandData = {
                options: {},
                original: args,
                remain: args.slice()
            };
            simulate.run(commandData).done((telemetryParameters: tacoUtils.ICommandTelemetryProperties) => {
                telemetryParameters.should.be.eql(expectedProperties);
                done();
            }, done);
        }

        it("returns the expected properties when run with no parameters", function (done: MochaDone): void {
            var expected: tacoUtils.ICommandTelemetryProperties = {
                platform: {value: "browser", isPii: false},
                target: {value: "chrome", isPii: false}
            };
            runSimulateAndVerifyTelemetryProps([], expected, done);
        });

        it("returns the expected properties when run with platform specified", function (done: MochaDone): void {
            var expected: tacoUtils.ICommandTelemetryProperties = {
                platform: {value: "android", isPii: false},
                target: {value: "chrome", isPii: false}
            };
            runSimulateAndVerifyTelemetryProps(["android"], expected, done);
        });

        it("returns the expected properties when run with target browser specified", function (done: MochaDone): void {
            var expected: tacoUtils.ICommandTelemetryProperties = {
                platform: {value: "browser", isPii: false},
                target: {value: "ie", isPii: false}
            };
            runSimulateAndVerifyTelemetryProps(["", "--target=ie"], expected, done);
        });

        it("returns the expected properties when run with platform and target browser specified", function (done: MochaDone): void {
            var expected: tacoUtils.ICommandTelemetryProperties = {
                platform: {value: "ios", isPii: false},
                target: {value: "edge", isPii: false}
            };
            runSimulateAndVerifyTelemetryProps(["ios", "--target=edge"], expected, done);
        });
    });
});
