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
import testUtil = require ("../testUtils/testHelper");

import TestHelper = testUtil.TestHelper;

describe("taco Errors in taco-utils", function (): void {
    it("Verify taco Errors in taco-utils", function (): void {
        TestHelper.verifyTacoErrors(path.join(__dirname, "../tacoErrorCodes.js"), resources, 100, 999);
    });
});

