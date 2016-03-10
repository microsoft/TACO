// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/// <reference path="../../typings/mocha.d.ts" />

"use strict";

import path = require ("path");

import resources = require ("../resources/resourceManager");
import tacoTestUtils = require("taco-tests-utils");

import TacoErrorTestHelper = tacoTestUtils.TacoErrorTestHelper;

describe("taco Errors in taco-kits", function (): void {
    it("Verify taco Errors in taco-kits", function (): void {
        TacoErrorTestHelper.verifyTacoErrors(path.join(__dirname, "../tacoErrorCodes.js"), resources, 2000, 2099);
    });
});

