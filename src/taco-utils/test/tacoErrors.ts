/**
 * ******************************************************
 *                                                       *
 *   Copyright (C) Microsoft. All rights reserved.       *
 *                                                       *
 *******************************************************
 */

/// <reference path="../../typings/mocha.d.ts" />

"use strict";

import path = require ("path");

import resources = require ("../resources/resourceManager");
import tacoTestUtils = require("taco-tests-utils");

import TacoErrorTestHelper = tacoTestUtils.TacoErrorTestHelper;

describe("taco Errors in taco-utils", function (): void {
    it("Verify taco Errors in taco-utils", function (): void {
        TacoErrorTestHelper.verifyTacoErrors(path.join(__dirname, "../tacoErrorCodes.js"), resources, 100, 999);
    });
});

