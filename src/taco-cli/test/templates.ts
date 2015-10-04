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

/* tslint:disable:no-var-requires */
// var require needed for should module to work correctly
// Note not import: We don't want to refer to shouldModule, but we need the require to occur since it modifies the prototype of Object.
var shouldModule: any = require("should");
/* tslint:enable:no-var-requires */

/* tslint:disable:no-var-requires */
// Special case to allow using color package with index signature for style rules
var colors: any = require("colors/safe");
/* tslint:enable:no-var-requires */

import tacoUtils = require ("taco-utils");
import Templates = require ("../cli/templates");
import ms = require ("./utils/memoryStream");

import commands = tacoUtils.Commands.ICommandData;

describe("templates", function (): void {
    this.timeout(20000);

    function templatesRun(): Q.Promise<any> {
        var templates: Templates = new Templates();
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
        // because of function overloading assigning "(buffer: string, cb?: Function) => boolean" as the type for
        // stdoutWrite just doesn't work
        var stdoutWrite: any = process.stdout.write; // We save the original implementation, so we can restore it later
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
                var expected: any = [
                    "CommandTemplatesHeader",
                    "",
                    "   blank ............... BlankTemplateName",
                    "   typescript .......... TypescriptTemplateName",
                    "",
                    "HowToUseCreateProjectWithTemplate",
                    ""].join("\n");
                var actual: string = colors.strip(memoryStdout.contentsAsText()); // The colors add extra characters
                actual.should.be.equal(expected);
                done();
            }, done);
        });
    });
});
