/**
 * ******************************************************
 *                                                       *
 *   Copyright (C) Microsoft. All rights reserved.       *
 *                                                       *
 *******************************************************
 */

/// <reference path="../../typings/mocha.d.ts" />
/// <reference path="../../typings/tacoErrorTestHelper.d.ts" />

"use strict";

import mocha = require ("mocha");
import path = require ("path");

import resources = require ("../resources/resourceManager");
import tacoTestUtils = require("taco-tests-utils");

import TacoErrorTestHelper = tacoTestUtils.TacoErrorTestHelper;

describe("Taco Errors in TACO", function (): void {
    it("Verify TACO Errors in TACO", function (): void {
        TacoErrorTestHelper.verifyTacoErrors(path.join(__dirname, "../cli/tacoErrorCodes.js"), resources, 5000, 5999);
    });
    it("Verify removed TACO Errors are not taken", function (): void {
        var excludeErrorCodes: number[] = [5001, 5002, 5003, 5015, 5016, 5454, 5455, 5535];
        TacoErrorTestHelper.verifyExcludedTacoErrors(path.join(__dirname, "../cli/tacoErrorCodes.js"), resources, excludeErrorCodes);
    });
});

