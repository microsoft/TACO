/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */
/// <reference path="../../typings/node.d.ts"/>
/// <reference path="../../typings/should.d.ts"/>
/// <reference path="../../typings/mocha.d.ts"/>
"use strict";
import path = require ("path");
import should = require ("should");
import mocha = require ("mocha");

import tacoUtility = require ("../tacoUtils");
import resourceManager = require ("../resourceManager");

import ResourceManager = resourceManager.ResourceManager;

var resources: resourceManager.ResourceManager = null;

describe("resources", function (): void {
    before(function (): void {
        resources = new tacoUtility.ResourceManager(path.join(__dirname, "resources"), "en");
    });

    it("should use the default language by default", function (): void {
        var expectedResources = require(path.join(__dirname, "/resources/en/resources.json"));
        var actual = resources.getString("SimpleMessage");
        var expected = expectedResources["SimpleMessage"];
        actual.should.equal(expected);
    });

    it("should correctly return strings for a primary language", function (): void {
        var expectedResources = require(path.join(__dirname, "/resources/en/resources.json"));
        var actual = resources.getStringForLanguage("en", "SimpleMessage");
        var expected = expectedResources["SimpleMessage"];
        actual.should.equal(expected);
    });

    it("should correctly return strings for a non-english primary language", function (): void {
        var expectedResources = require(path.join(__dirname, "/resources/it/resources.json"));
        var actual = resources.getStringForLanguage("it", "SimpleMessage");
        var expected = expectedResources["SimpleMessage"];
        actual.should.equal(expected);
    });

    it("should correctly substitute arguments in resource strings", function (): void {
        var expectedResources = require(path.join(__dirname, "/resources/en/resources.json"));
        var actual = resources.getStringForLanguage("en", "MessageWithArgs", "Billy", "Fish");
        var expected = expectedResources["MessageWithArgs"];
        var actualBackToExpected = actual.replace("Billy", "{0}").replace("Fish", "{1}");
        actualBackToExpected.should.equal(expected);

        var actualWithArrayArgs = resources.getStringForLanguage("en", "MessageWithArgs", ["Billy", "Fish"]);
        actualWithArrayArgs.should.equal(actual);
    });

    it("should find the most specific region for a language", function (): void {
        var expectedResources = require(path.join(__dirname, "/resources/it-ch/resources.json"));
        var actual = resources.getStringForLanguage("it-ch", "SimpleMessage");
        var expected = expectedResources["SimpleMessage"];
        actual.should.equal(expected);
    });

    it("should fall back to more general languages if a more specific one is not available", function (): void {
        var expectedResources = require(path.join(__dirname, "/resources/it/resources.json"));
        var actual = resources.getStringForLanguage("it-DE", "SimpleMessage");
        var expected = expectedResources["SimpleMessage"];
        actual.should.equal(expected);
    });

    it("should fall back to english as a default if the language is unknown", function (): void {
        var expectedResources = require(path.join(__dirname, "/resources/en/resources.json"));
        var actual = resources.getStringForLanguage("hy-Latn-IT-arevela", "SimpleMessage");
        var expected = expectedResources["SimpleMessage"];
        actual.should.equal(expected);
    });

    it("should return undefined for bad resource identifiers", function (): void {
        var actual = resources.getStringForLanguage("en", "NoResourceDefinedForThis");
        should(actual).be.equal(undefined);
    });

    it("should handle unicode in resource strings", function (): void {
        var expectedResources = require(path.join(__dirname, "/resources/gb18030/resources.json"));
        var actual = resources.getStringForLanguage("gb18030", "UnicodeMessage");
        var expected = expectedResources["UnicodeMessage"];
        actual.should.equal(expected);
    });

    it("should replace all placeholders correctly", function (): void {
        var actual = resources.getStringForLanguage("en", "MessageWithRepeatedArgs", "X");
        actual.indexOf("{0}").should.be.equal(-1);
        var expectedResources = require(path.join(__dirname, "/resources/en/resources.json"));
        var expected = expectedResources["MessageWithRepeatedArgs"];
        expected.replace(/\{0\}/g, "X").should.equal(actual);
    });
});
