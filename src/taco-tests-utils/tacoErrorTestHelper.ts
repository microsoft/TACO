// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/should.d.ts" />

"use strict";

import shouldModule = require("should");

export class TacoErrorTestHelper {
    public static verifyTacoErrors(fileName: string, resources: any, minErrorCode: number, maxErrorCode: number): void {
        var errorCodes: any = TacoErrorTestHelper.getErrorCodes(fileName);

        Object.keys(errorCodes).forEach(function(errorCode: string): void {
            // Loop over all error codes, filter out numeric values
            if (isNaN(parseInt(errorCode, 10))) {
                // Verify that we don't have 2 errors with same error code
                var numericErrorCode: number = errorCodes[errorCode];
                errorCode.should.be.equal(errorCodes[numericErrorCode],
                    errorCode + " and " + errorCodes[numericErrorCode] + " have been assigned same error code");

                // Verify that error code is within range
                shouldModule(numericErrorCode).greaterThan(minErrorCode, "error code " + errorCode + " is less than min: " + minErrorCode);
                shouldModule(numericErrorCode).lessThan(maxErrorCode, "error code " + errorCode + " is more than max: " + maxErrorCode);

                // Verify we have a resource string for the error code
                shouldModule(resources.getString(errorCode)).not.equal(null, "no resources found for error code " + errorCode);
            }
        });
    }

    public static verifyExcludedTacoErrors(fileName: string, resources: any, excludedErrorCodes: number[]): void {
        var errorCodes: any = TacoErrorTestHelper.getErrorCodes(fileName);
        excludedErrorCodes.forEach(excludedErrorCode => {
            shouldModule(excludedErrorCode in errorCodes).be.equal(false,
                "Exclude error code " + excludedErrorCode + "shouldn't be present in " + fileName);
        });
    }

    private static getErrorCodes(fileName: string): any {
        var errorCodes: any = require(fileName);
        // for taco-utils, we have TacoErrorCode is nested under module
        if (errorCodes.TacoErrorCode) {
            errorCodes = errorCodes.TacoErrorCode;
        }

        return errorCodes;
    }
}
