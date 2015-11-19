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
});

