/**
 * ******************************************************
 *                                                       *
 *   Copyright (C) Microsoft. All rights reserved.       *
 *                                                       *
 * ******************************************************
 */
/// <reference path="../../typings/should.d.ts"/>
/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/nopt.d.ts"/>
"use strict";
import should = require("should");
import mocha = require("mocha");

import utils = require("../util-helper");

describe("UtilHelper", function (): void {
    describe("parseArguments()", function (): void {
        function countFlags(parsed: Nopt.OptionsParsed): number {
            var count: number = 0;

            for (var property in parsed) {
                if (parsed.hasOwnProperty(property) && property != "argv") {
                    ++count;
                }
            }

            return count;
        };

        function hasUndefinedFlag(parsed: Nopt.OptionsParsed, flagName: string): boolean {
            return parsed.hasOwnProperty(flagName) && !parsed[flagName];
        };

        it("shouldn't throw errors for empty and missing parameters", function (): void {
            utils.UtilHelper.parseArguments({});
            utils.UtilHelper.parseArguments({}, {});
            utils.UtilHelper.parseArguments({}, {}, []);
            utils.UtilHelper.parseArguments({}, {}, [], 0);
        });

        it("should parse arguments properly when no flags are specified", function (): void {
            var parsed: Nopt.OptionsParsed = utils.UtilHelper.parseArguments({}, {}, "create foo baz path a-es--".split(" "), 1);

            // Should have detected 0 flags, and have a remain of 4
            countFlags(parsed).should.equal(0);
            parsed.argv.remain.length.should.equal(4);
        });

        it("should parse arguments properly when nopt-Boolean and nopt-String flags are specified", function (): void {
            var knownOptions: Nopt.FlagTypeMap = {
                "foo": String,
                "bar": Boolean,
                "baz": String
            };
            var parsed: Nopt.OptionsParsed = utils.UtilHelper.parseArguments(knownOptions, {}, "create --bar boo --foo faz doo --baz baz".split(" "), 1);

            // Should have detected 3 flags, and have a remain of 2 (boo and doo)
            countFlags(parsed).should.equal(3);
            parsed.argv.remain.length.should.equal(2);

            // Verify flag values
            parsed["bar"].should.equal(true);
            parsed["foo"].should.equal("faz");
            parsed["baz"].should.equal("baz");
        });

        it("should mark nopt-String flags as undefined if they have empty values", function (): void {
            var knownOptions: Nopt.FlagTypeMap = {
                "foo": String,
                "bar": Boolean,
                "baz": String
            };
            var parsed: Nopt.OptionsParsed = utils.UtilHelper.parseArguments(knownOptions, {}, "create boo --foo --baz --bar baz".split(" "), 1);

            // Should have detected 3 flags, and have a remain of 2 (boo, baz)
            countFlags(parsed).should.equal(3);
            parsed.argv.remain.length.should.equal(2);

            // Verify flag values
            parsed["bar"].should.equal(true);
            hasUndefinedFlag(parsed, "foo").should.equal(true);
            hasUndefinedFlag(parsed, "baz").should.equal(true);
        });

        it("should successfully parse abbreviated flags", function (): void {
            var knownOptions: Nopt.FlagTypeMap = {
                "foo": String,
                "bar": Boolean,
                "kaz": String
            };
            var parsed: Nopt.OptionsParsed = utils.UtilHelper.parseArguments(knownOptions, {}, "create boo --fo --ka baz --b".split(" "), 1);

            // Should have detected 3 flags, and have a remain of 1 (boo)
            countFlags(parsed).should.equal(3);
            parsed.argv.remain.length.should.equal(1);

            // Verify flag values
            parsed["bar"].should.equal(true);
            hasUndefinedFlag(parsed, "foo").should.equal(true);
            parsed["kaz"].should.equal("baz");
        });

        it("should parse arguments properly when shorthands are specified", function (): void {
            var knownOptions: Nopt.FlagTypeMap = {
                "foo": String,
                "bar": Boolean,
                "kaz": String
            };
            var shortHands: Nopt.ShortFlags = { "k4": ["--kaz", "4.0.0"] };
            var parsed: Nopt.OptionsParsed = utils.UtilHelper.parseArguments(knownOptions, shortHands, "create --ba --foo --k4 boo".split(" "), 1);

            // Should have detected 3 flags, and have a remain of 1 (boo)
            countFlags(parsed).should.equal(3);
            parsed.argv.remain.length.should.equal(1);

            // Verify flag values
            parsed["bar"].should.equal(true);
            hasUndefinedFlag(parsed, "foo").should.equal(true);
            parsed["kaz"].should.equal("4.0.0");
        });
    });
});