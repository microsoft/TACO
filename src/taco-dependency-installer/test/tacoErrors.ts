// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/// <reference path="../../typings/mocha.d.ts" />

"use strict";

import mocha = require ("mocha");
import path = require ("path");

import resources = require ("../resources/resourceManager");
import tacoTestUtils = require("taco-tests-utils");

import TacoErrorTestHelper = tacoTestUtils.TacoErrorTestHelper;

describe("Taco Errors in TACO", function (): void {
    it("Verify TACO Errors in TACO", function (): void {
        TacoErrorTestHelper.verifyTacoErrors(path.join(__dirname, "../tacoErrorCodes.js"), resources, 2100, 2499);
    });
});

