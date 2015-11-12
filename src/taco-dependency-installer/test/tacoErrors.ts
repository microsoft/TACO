/**
 * ******************************************************
 *                                                       *
 *   Copyright (C) Microsoft. All rights reserved.       *
 *                                                       *
 *******************************************************
 */

/// <reference path="../../typings/mocha.d.ts" />

"use strict";

import mocha = require ("mocha");
import path = require ("path");

import resources = require ("../resources/resourceManager");
import testUtil = require ("../../taco-utils/testUtils/testHelper");

import TestHelper = testUtil.TestHelper;

describe("Taco Errors in TACO", function (): void {
    it("Verify TACO Errors in TACO", function (): void {
        TestHelper.verifyTacoErrors(path.join(__dirname, "../cli/tacoErrorCodes.js"), resources, 2100, 2499);
    });
});

