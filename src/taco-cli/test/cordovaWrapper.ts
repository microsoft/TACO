/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */
/// <reference path="../../typings/mocha.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/should.d.ts" />
/// <reference path="../../typings/cordovaExtensions.d.ts" />
"use strict";

import os = require ("os");
import path = require ("path");
import Q = require ("q");
import should = require ("should");
import tacoUtils = require ("taco-utils");

import CordovaWrapper = require ("../cli/utils/cordovaWrapper");
import mockCordova = require ("./utils/mockCordova");
import ProjectHelper = require ("../cli/utils/projectHelper");
import TacoErrorCodes = require ("../cli/tacoErrorCodes");

import Commands = tacoUtils.Commands;
import TacoPackageLoader = tacoUtils.TacoPackageLoader;
import utils = tacoUtils.UtilHelper;
import TacoError = tacoUtils.TacoError;

describe("cordovaWrapper", () => {
    var dummyData: Commands.ICommandData = { options: {}, original: [], remain: [] };
    var originalDir: string;
    before((done: MochaDone): void => {
        var tacoHome: string = path.join(os.tmpdir(), "taco-cli", "cordovaWrapper");
        var projectHome: string = path.join(tacoHome, "example");
        utils.createDirectoryIfNecessary(tacoHome);
        utils.createDirectoryIfNecessary(projectHome);
        originalDir = process.cwd();
        process.chdir(projectHome);
        // Set up tests with mocked out Cordova implementation
        var cordova: mockCordova.MockCordova510 = mockCordova.MockCordova510.default;
        cordova.raw.build = (): Q.Promise<any> => {
            throw new Error("Build Error thrown synchronously");
        };
        cordova.raw.run = (): Q.Promise<any> => {
            return Q.reject(new Error("Run Rejected Promise"));
        };
        cordova.raw.emulate = (): Q.Promise<any> => {
            var deferred: Q.Deferred<any> = Q.defer();
            setTimeout(() => {
                throw new Error("Emulate Error thrown asynchronously");
            }, 1);
            return deferred.promise;
        };

        TacoPackageLoader.mockForTests = {
            lazyRequire: (packageName: string, packageId: string, logLevel?: TacoUtility.InstallLogLevel): Q.Promise<mockCordova.MockCordova510> => {
                if (packageName !== "cordova") {
                    return Q.reject<mockCordova.MockCordova510>(new Error("Expected to load cordova package"));
                }
                return Q(cordova);
            },
            lazyRun: (packageName: string, packageId: string, commandName: string): Q.Promise<string> => Q("cordova")
        };
        ProjectHelper.createJsonFileWithContents(path.join(projectHome, "taco.json"), { "cordova-cli": "4.3.0" })
            .then(() => done(), done);
    });

    after((): void => {
        tacoUtils.TacoPackageLoader.mockForTests = null;
        process.chdir(originalDir);
    });

    it("should catch synchronous exceptions thrown from cordova", (done: MochaDone): void => {
        CordovaWrapper.build(dummyData).then((): void => {
            throw new Error("Should have failed with a synchronous exception");
        }, (err: Error): void => {
            should(err.message).be.equal("Build Error thrown synchronously");
        }).done((): void => done(), done);
    });

    it("should handle cordova's rejected promises", (done: MochaDone): void => {
        CordovaWrapper.run(dummyData).then((): void => {
            throw new Error("Should have failed with a rejected promise");
        }, (err: Error): void => {
            should(err.message).be.equal("Run Rejected Promise");
        }).done((): void => done(), done);
    });

    it("should catch asynchronous exceptions thrown from cordova", (done: MochaDone): void => {
        CordovaWrapper.emulate(dummyData).then((): void => {
            throw new Error("Should have failed with an asynchronous exception");
        }, (err: TacoError): void => {
            should(err.errorCode).be.equal(TacoErrorCodes.CordovaCommandUnhandledException);
        }).done((): void => done(), done);
    });

    // Note: this test assumes that a global install of Cordova exists.
    it("should handle problems launching cordova via the command line", (done: MochaDone): void => {
        CordovaWrapper.cli(["fakeCommand"]).then((): void => {
            throw new Error("Should have failed");
        }, (err: TacoError): void => {
            err.errorCode.should.be.equal(TacoErrorCodes.CordovaCommandFailed);
        }).done((): void => done(), done);
    });
});
