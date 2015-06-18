/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../../typings/tacoUtils.d.ts"/>
/// <reference path="../../typings/tacoKits.d.ts"/>

"use strict";

var should_module = require("should"); // Note not import: We don't want to refer to should_module, but we need the require to occur since it modifies the prototype of Object.

import tacoKits = require ("taco-kits");
import tacoUtils = require ("taco-utils");
import Templates = require ("../cli/templates");

import commands = tacoUtils.Commands.ICommandData;
import tacoError = tacoUtils.TacoError;
import TacoKitsErrorCodes = tacoKits.TacoErrorCode;

describe("templates", function (): void {
    it("'taco templates' should not throw any error", function (done: MochaDone): void {
        var templates = new Templates();
        var data: commands = {
            options: { },
            original: [],
            remain: []
        };

        templates.run(data).then(done, done);
    });
});