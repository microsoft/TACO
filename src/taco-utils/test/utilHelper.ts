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
/// <reference path="../../typings/tacoUtils.d.ts" />
"use strict";
/* tslint:disable:no-var-requires */
// var require needed for should module to work correctly
// Note not import: We don't want to refer to shouldModule, but we need the require to occur since it modifies the prototype of Object.
var shouldModule: any = require("should");
/* tslint:enable:no-var-requires */
import mocha = require ("mocha");
import fs = require("fs");
import os = require("os");
import mkdirp = require ("mkdirp");
import path = require("path");
import rimraf = require ("rimraf");

import argsHelper = require ("../argsHelper");
import commands = require ("../commands");
import utils = require ("../utilHelper");
import tacoError = require ("../tacoError");
import tacoErrorCodes = require ("../tacoErrorCodes");

import ArgsHelper = argsHelper.ArgsHelper;
import UtilHelper = utils.UtilHelper;
import TacoError = tacoError.TacoError;
import TacoErrorCodes = tacoErrorCodes.TacoErrorCode;

describe("UtilHelper", function (): void {
    describe("parseArguments()", function (): void {
        function hasUndefinedFlag(parsed: commands.Commands.ICommandData, flagName: string): boolean {
            return !parsed.options[flagName];
        };

        it("shouldn't throw errors for empty and missing parameters", function (): void {
            ArgsHelper.parseArguments({});
            ArgsHelper.parseArguments({}, {});
            ArgsHelper.parseArguments({}, {}, []);
            ArgsHelper.parseArguments({}, {}, [], 0);
        });

        it("should parse arguments properly when no flags are specified", function (): void {
            var parsed: commands.Commands.ICommandData = ArgsHelper.parseArguments({}, {}, "create foo baz path a-es--".split(" "), 1);

            // Should have detected 0 flags, and have a remain of 4
            Object.keys(parsed.options).length.should.equal(0);
            parsed.remain.length.should.equal(4);

            // Verify remain order and values
            parsed.remain[0].should.equal("foo");
            parsed.remain[1].should.equal("baz");
            parsed.remain[2].should.equal("path");
            parsed.remain[3].should.equal("a-es--");
        });

        it("should parse arguments properly when nopt-Boolean and nopt-String flags are specified", function (): void {
            var knownOptions: Nopt.FlagTypeMap = {
                foo: String,
                bar: Boolean,
                baz: String
            };
            var parsed: commands.Commands.ICommandData = ArgsHelper.parseArguments(knownOptions, {}, "create --bar boo --foo faz doo --baz baz".split(" "), 1);

            // Should have detected 3 flags, and have a remain of 2 (boo, doo)
            Object.keys(parsed.options).length.should.equal(3);
            parsed.remain.length.should.equal(2);

            // Verify flag values
            parsed.options["bar"].should.equal(true);
            parsed.options["foo"].should.equal("faz");
            parsed.options["baz"].should.equal("baz");

            // Verify remain order and values
            parsed.remain[0].should.equal("boo");
            parsed.remain[1].should.equal("doo");
        });

        it("should mark nopt-String flags as undefined if they have empty values", function (): void {
            var knownOptions: Nopt.FlagTypeMap = {
                foo: String,
                bar: Boolean,
                baz: String
            };
            var parsed: commands.Commands.ICommandData = ArgsHelper.parseArguments(knownOptions, {}, "create boo --foo --baz --bar baz".split(" "), 1);

            // Should have detected 3 flags, and have a remain of 2 (boo, baz)
            Object.keys(parsed.options).length.should.equal(3);
            parsed.remain.length.should.equal(2);

            // Verify flag values
            parsed.options["bar"].should.equal(true);
            hasUndefinedFlag(parsed, "foo").should.equal(true);
            hasUndefinedFlag(parsed, "baz").should.equal(true);

            // Verify remain order and values
            parsed.remain[0].should.equal("boo");
            parsed.remain[1].should.equal("baz");
        });

        it("should successfully parse abbreviated flags", function (): void {
            var knownOptions: Nopt.FlagTypeMap = {
                foo: String,
                bar: Boolean,
                kaz: String
            };
            var parsed: commands.Commands.ICommandData = ArgsHelper.parseArguments(knownOptions, {}, "create boo --fo --ka baz --b".split(" "), 1);

            // Should have detected 3 flags, and have a remain of 1 (boo)
            Object.keys(parsed.options).length.should.equal(3);
            parsed.remain.length.should.equal(1);

            // Verify flag values
            parsed.options["bar"].should.equal(true);
            hasUndefinedFlag(parsed, "foo").should.equal(true);
            parsed.options["kaz"].should.equal("baz");

            // Verify remain order and values
            parsed.remain[0].should.equal("boo");
        });

        it("should parse arguments properly when shorthands are specified", function (): void {
            var knownOptions: Nopt.FlagTypeMap = {
                foo: String,
                bar: Boolean,
                kaz: String
            };
            var shortHands: Nopt.ShortFlags = { k4: ["--kaz", "4.0.0"] };
            var parsed: commands.Commands.ICommandData = ArgsHelper.parseArguments(knownOptions, shortHands, "create --ba --foo --k4 boo".split(" "), 1);

            // Should have detected 3 flags, and have a remain of 1 (boo)
            Object.keys(parsed.options).length.should.equal(3);
            parsed.remain.length.should.equal(1);

            // Verify flag values
            parsed.options["bar"].should.equal(true);
            hasUndefinedFlag(parsed, "foo").should.equal(true);
            parsed.options["kaz"].should.equal("4.0.0");

            // Verify remain order and values
            parsed.remain[0].should.equal("boo");
        });

        it("should handle complex scenarios correctly", function (): void {
            var knownOptions: Nopt.FlagTypeMap = {
                foo: String,
                bar: Boolean,
                baz: String
            };
            var parsed: commands.Commands.ICommandData = ArgsHelper.parseArguments(knownOptions, {}, "create --ba -baz foo -f boo -fo foo ------foo --foo bar -bar bar foo -bazbaz --baz".split(" "), 1);

            // Should have detected 5 flags: ba, baz, foo, bar, bazbaz
            Object.keys(parsed.options).length.should.equal(5);

            // Should have remain of 2, bar and foo
            parsed.remain.length.should.equal(2);

            // Verify flag values
            parsed.options["ba"].should.equal(true);
            parsed.options["bar"].should.equal(true);
            hasUndefinedFlag(parsed, "baz").should.equal(true);
            parsed.options["bazbaz"].should.equal(true);
            parsed.options["foo"].should.equal("bar");

            // Verify remain order and values
            parsed.remain[0].should.equal("bar");
            parsed.remain[1].should.equal("foo");
        });
    });

    describe("parseUserJSON()", function (): void {
        var testHome: string = path.join(os.tmpdir(), "taco-utils", "parseUserJSON");
        before(function (): void {
            process.env["TACO_HOME"] = testHome;
            rimraf.sync(testHome);
            mkdirp.sync(testHome);
        });

        after(function (): void {
            rimraf(testHome, function (err: Error): void {/* ignored */ }); // Not sync, and ignore errors
        });

        it("read UTF-16 file", function (): void {
            writeBufferAndValidate("utf16.json", (stringified: string) => new Buffer(stringified, "utf16le"));
        });

        it("read UTF-8 file", function (): void {
            writeBufferAndValidate("utf8.json", (stringified: string) => new Buffer(stringified, "utf8"));
        });

        it("read UTF-8 with BOM", function (): void {
            var parsedJson = UtilHelper.parseUserJSON(path.resolve(__dirname, "taco_utf8BOM.json"));
            parsedJson["cordova-cli"].should.equal("5.3.3");
        });

        it("read file which doesn't exist", function(): void {
            try {
                UtilHelper.parseUserJSON(path.resolve(__dirname, "nonExistentFile.json"));
                shouldModule.fail(true, false, "Expected error: " + TacoErrorCodes.ErrorUserJsonMissing);
            } catch (e) {
                (<TacoError>e).errorCode.should.equal(TacoErrorCodes.ErrorUserJsonMissing);
            }
        });

        it("read malformed file", function (): void {
            writeBufferAndValidate("utf8.json", stringified => {
                var buffer: Buffer = new Buffer(stringified, "utf8");
                var malformedBuffer: Buffer = new Buffer(buffer.length + 3);
                // add some random bytes to the malformed buffer
                malformedBuffer.write("\u00bd\u00bc\u00be");
                buffer.copy(malformedBuffer, malformedBuffer.length, 0);
                return malformedBuffer;
            }, TacoErrorCodes.ErrorUserJsonMalformed);
        });

        function writeBufferAndValidate(filename: string, getBuffer: (stringified: string) => Buffer, expectedErrorCode?: TacoErrorCodes) {
            var x = { "cordova-cli": 5.8 };
            var stringified: string = JSON.stringify(x);
            var buffer: Buffer = getBuffer(stringified);

            var filepath = path.join(testHome, filename);
            fs.writeFileSync(filepath, buffer);
            try {
                var parsedJson = UtilHelper.parseUserJSON(filepath);
                if (expectedErrorCode) {
                    shouldModule.fail(true, false, "Expected error: " + expectedErrorCode);
                } else {
                    parsedJson.should.eql(x);
                }
            } catch (e) {
                if (expectedErrorCode) {
                    (<TacoError>e).errorCode.should.equal(expectedErrorCode);
                } else {
                    shouldModule.fail(true, false, e);
                }
            }
        }
    });
});
