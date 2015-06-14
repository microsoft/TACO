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

import logFormathelper = require ("../logFormatHelper");
import LogFormatHelper = logFormathelper.LogFormatHelper;

describe("logFormathelper", function (): void {
    it("should allow all supported styles for a correctly formatted string", function (): void { 
        // Sample input string expanded...
        //  <error>The </error>
        //  <warn> quick <br/>
        //  <link>brown </link>
        //  fox
        //  <title> jumps
        //  <link> over </link>a
        //  </title>
        //  lazy
        //  </warn>
        //  <success> dog
        //  <key> </key>
        //  </success>.
        //  <key> The </key>
        //  <highlight>
        //  <helptitle>quick <br/>brown </helptitle>
        //  <synopsis> <br/>
        //  <kitid> fox </kitid> jumps
        //  <deprecatedkit> over </deprecatedkit>
        //  </synopsis>
        //  <defaultkit> a lazy dog</defaultkit>
        //  </highlight>
        //  <underline />
        var input: string = "<error>The</error><warn>quick <br/><link>brown</link> fox <title>jumps <link>over </link>a </title> lazy</warn><success>dog<key></key></success>.<key>The</key> <highlight><helptitle>quick <br/>brown</helptitle> <synopsis><br/><kitid>fox</kitid> jumps<deprecatedkit> over</deprecatedkit></synopsis> <defaultkit>a lazy dog</defaultkit></highlight><underline/>";
        var formatted: string = LogFormatHelper.toFormattedString(input);
        should(formatted).be.not.equal(null);
    });

    it("should allow empty string", function (): void {
        var input: string = "";
        var formatted: string = LogFormatHelper.toFormattedString(input);
        should(formatted).be.equal(os.EOL);

        var input: string = null;
        var formatted: string = LogFormatHelper.toFormattedString(input);
        should(formatted).be.equal(os.EOL);
    });

    it("should allow deeply nested tags", function (): void {
        var input: string = "<error><warn><link><title><success><key><highlight><helptitle><synopsis><kitid><deprecatedkit><defaultkit>The quick brown fox jumps over a lazy dog</defaultkit></deprecatedkit></kitid></synopsis></helptitle></highlight></key></success></title></link></warn></error>";
        var formatted: string = LogFormatHelper.toFormattedString(input);
        should(formatted).be.not.equal(null);
    });

    it("should fail for missing helptitle start tag", function (): void {
        verifyFailureScenario("<error>The</error><warn>quick <br/><link>brown</link> fox <title>jumps <link>over </link>a </title> lazy</warn><success>dog<key></key></success>.<key>The</key> <highlight>quick <br/>brown</helptitle> <synopsis><br/><kitid>fox</kitid> jumps<deprecatedkit> over</deprecatedkit></synopsis> <defaultkit>a lazy dog</defaultkit></highlight><underline/>");
    });

    it("should fail for missing synopsis end tag", function (): void {
        verifyFailureScenario("<error>The</error><warn>quick <br/><link>brown</link> fox <title>jumps <link>over </link>a </title> lazy</warn><success>dog<key></key></success>.<key>The</key> <highlight><helptitle>quick <br/>brown</helptitle> <synopsis><br/><kitid>fox</kitid> jumps<deprecatedkit> over</deprecatedkit> <defaultkit>a lazy dog</defaultkit></highlight><underline/>");
    });

    it("should fail for no end tags", function (): void {
        verifyFailureScenario("<error>The<warn>quick <br/><link>brown fox <title>jumps <link>over a lazy<success>dog");
    });

    it("should fail for no start tags", function (): void {
        verifyFailureScenario(" The</warn>quick <br/></link>brown fox </title>jumps </link>over a lazy</success>dog");
    });

    it("should fail for unknown tags", function (): void {
        verifyFailureScenario(" The quick <br/><random>brown fox </random>jumps over a lazy dog");
    });
});

function verifyFailureScenario(input: string): void {
    try {
        var formatted: string = LogFormatHelper.toFormattedString(input);
        should(formatted).be.equal(null);
    } catch (err) {
        should(err).be.not.equal(null);
    }
}