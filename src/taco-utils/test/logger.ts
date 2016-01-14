/**
 * ******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 * ******************************************************
 */

/// <reference path="../../typings/node.d.ts"/>
/// <reference path="../../typings/should.d.ts"/>
/// <reference path="../../typings/mocha.d.ts"/>

"use strict";

import mocha = require ("mocha");
import os = require ("os");
import should = require ("should");

import logger = require ("../logger");
import Logger = logger.Logger;

describe("logger", function (): void {

    it("should support regular strings", function (): void {
        verifyScenario("hello world");
    });
    it("should support unknown tags with strings", function (): void {
        verifyScenario("<h1>hello world</h1>");
    });
    it("should support known tags with strings", function (): void {
        verifyScenario("<helptitle>hello world</helptitle>");
    });
    it("should support undefined strings", function (): void {
        verifyScenario(undefined);
    });
    it("should support null strings", function (): void {
        verifyScenario(null);
    });
});

function verifyScenario(input: string): void {
    try {
        Logger.log(input);
        Logger.logError(input);
        Logger.logWarning(input);
        should(true).be.ok;
    } catch (err) {
        console.log(err);
        should(true).not.be.ok;
    }
}
