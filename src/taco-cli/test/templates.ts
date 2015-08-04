/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/should.d.ts"/>
/// <reference path="../../typings/tacoUtils.d.ts"/>
/// <reference path="../../typings/tacoKits.d.ts"/>

"use strict";

var should_module = require("should"); // Note not import: We don't want to refer to should_module, but we need the require to occur since it modifies the prototype of Object.

import tacoUtils = require ("taco-utils");
import Templates = require ("../cli/templates");
import ms = require ("./utils/memoryStream");

var colors = require("colors/safe");

import commands = tacoUtils.Commands.ICommandData;

describe("templates", function (): void {
    this.timeout(20000);

    function templatesRun(): Q.Promise<any> {
        var templates = new Templates();
        var data: commands = {
            options: {},
            original: [],
            remain: []
        };

        return templates.run(data);
    }

    var previous: boolean;
    before(() => {
        previous = process.env["TACO_UNIT_TEST"];
        process.env["TACO_UNIT_TEST"] = true;
    });

    after(() => {
        process.env["TACO_UNIT_TEST"] = previous;
    });

    it("'taco templates' should not throw any error", function (done: MochaDone): void {
        templatesRun().then(done, done);
    });

    describe("Onboarding experience", function (): void {
        var stdoutWrite = process.stdout.write; // We save the original implementation, so we can restore it later
        var memoryStdout: ms.MemoryStream;

        beforeEach(() => {
            memoryStdout = new ms.MemoryStream; // Each individual test gets a new and empty console
            process.stdout.write = memoryStdout.writeAsFunction(); // We'll be printing into an "in-memory" console, so we can test the output
        });

        after(() => {
            // We just need to reset the stdout just once, after all the tests have finished
            process.stdout.write = stdoutWrite;
        });

        it("templates prints the onboarding experience", function (done: MochaDone): void {
            templatesRun().done(() => {
                var expected = [
                    "CommandTemplatesHeader",
                    "",
                    "   blank ............... BlankTemplateName",
                    "   typescript .......... TypescriptTemplateName",
                    "",
                    "HowToUseCreateProjectWithTemplate",
                    ""].join("\n");
                var actual = colors.strip(memoryStdout.contentsAsText()); // The colors add extra characters
                actual.should.be.equal(expected);
                done();
            }, done);
        });
    });
});