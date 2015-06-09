/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/should.d.ts" />

"use strict";

import should = require ("should");

export class TestHelper {
    public static verifyTacoErrors(fileName: string, resources: any, minErrorCode: number, maxErrorCode: number): void {
        var errorCodes: any = require(fileName);
        // for taco-utils, we have TacoErrorCode is nested under module
        if (errorCodes.TacoErrorCode) {
            errorCodes = errorCodes.TacoErrorCode;
        }

        Object.keys(errorCodes).forEach(function (errorCode: string): void {
            // Loop over all error codes, filter out numeric values
            if (isNaN(parseInt(errorCode))) { 
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
}
