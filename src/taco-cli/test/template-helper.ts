/**
 * ******************************************************
 *                                                       *
 *   Copyright (C) Microsoft. All rights reserved.       *
 *                                                       *
 * ******************************************************
 */
/// <reference path="../../typings/should.d.ts"/>
/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/wrench.d.ts"/>

"use strict";
import should = require("should");
import mocha = require("mocha");

import TemplateHelper = require("../cli/utils/template-helper");
import templates = TemplateHelper.TemplateHelper

describe("TemplateHelper", function (): void {
    describe("processTokenReplacement()", function () {
        it("should correctly replace tokens with their values everywhere in the project", function (mocha: MochaDone) {

        });
    });

    describe("copyRemainingItems()", function () {
        it("should correctly copy remaining files and folders", function (mocha: MochaDone) {

        });

        it("should not overwrite any existing files in the user's project", function (mocha: MochaDone) {

        });
    });

    describe("ensureTemplateInCache()", function () {
        it("should correctly", function (mocha: MochaDone) {

        });
    });

    describe("extractTemplateCacheInfo()", function () {

    });
});