// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/// <reference path="../../typings/mocha.d.ts" />

"use strict";

import path = require ("path");
import should = require("should");

import resources = require ("../resources/resourceManager");
import resourceManager = require ("../resourceManager");
import tacoError = require("../tacoError");

describe("taco Errors in taco-utils", function (): void {
    it("Verify taco Errors in taco-utils", function (): void {
        verifyTacoErrors(path.join(__dirname, "../tacoErrorCodes.js"), resources, 100, 999);
    });

    it("should replace placeholders correctly", function (): void {
        var testResourceManager = new resourceManager.ResourceManager(path.join(__dirname, "resources"), "en");
        var testError = tacoError.TacoError.getError("MessageWithArgs", 10, testResourceManager, "foo", "bar", "baz");
        should(testError.message).equal(testResourceManager.getString("MessageWithArgs", "foo", "bar", "baz"));
    });

    it("getError() should return an error with the correct message for errors that have no placeholders", function (): void {
        var testResourceManager = new resourceManager.ResourceManager(path.join(__dirname, "resources"), "en");
        var testError = tacoError.TacoError.getError("SimpleMessage", 10, testResourceManager);
        should(testError.message).equal(testResourceManager.getString("SimpleMessage"));
    });

    it("wrapError() should return an error and inner error with the correct messages for errors that have no placeholders", function (): void {
        var innerErrorString: string = "Inner error";
        var testResourceManager = new resourceManager.ResourceManager(path.join(__dirname, "resources"), "en");
        var innerError: Error = new Error(innerErrorString);
        var testError = tacoError.TacoError.wrapError(innerError, "SimpleMessage", 10, testResourceManager);
        should(testError.message).equal(testResourceManager.getString("SimpleMessage"));
        should((<any>testError).innerError.message).equal(innerErrorString);
    });
});

    // FOLLOWING CODE IS COPIED FROM taco-tests-utils\tacoErrorTestHelper
    // TO AVOID CYCLIC DEPENDENCY BETWEEN taco-utils and taco-tests-utils
    function verifyTacoErrors(fileName: string, resources: any, minErrorCode: number, maxErrorCode: number): void {
        var errorCodes: any = require(fileName);
        // for taco-utils, we have TacoErrorCode is nested under module
        if (errorCodes.TacoErrorCode) {
            errorCodes = errorCodes.TacoErrorCode;
        }

        Object.keys(errorCodes).forEach(function (errorCode: string): void {
            // Loop over all error codes, filter out numeric values
            if (isNaN(parseInt(errorCode, 10))) {
                // Verify that we don't have 2 errors with same error code
                var numericErrorCode: number = errorCodes[errorCode];
                errorCode.should.be.equal(errorCodes[numericErrorCode],
                    errorCode + " and " + errorCodes[numericErrorCode] + " have been assigned same error code");

                // Verify that error code is within range
                should(numericErrorCode).greaterThan(minErrorCode, "error code " + errorCode + " is less than min: " + minErrorCode);
                should(numericErrorCode).lessThan(maxErrorCode, "error code " + errorCode + " is more than max: " + maxErrorCode);

                // Verify we have a resource string for the error code
                should(resources.getString(errorCode)).not.equal(null, "no resources found for error code " + errorCode);
            }
        });
    }


