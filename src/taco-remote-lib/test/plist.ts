/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */
/// <reference path="../../typings/mocha.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/taco-utils.d.ts" />
"use strict";
var should_module = require("should"); // Note not import: We don't want to refer to should_module, but we need the require to occur since it modifies the prototype of Object.

import fs = require ("fs");
import path = require ("path");

import plist = require ("../ios/plist");
import utils = require ("taco-utils");

import UtilHelper = utils.UtilHelper;

describe("plist", function (): void {
    before(function (): void {
        UtilHelper.createDirectoryIfNecessary(path.join(__dirname, "out", "plist"));
    });

    it("should create plist files correctly", function (): void {
        var outFile = path.join(__dirname, "out", "plist", "actualEnterpriseApp.plist");
        plist.createEnterprisePlist(path.join(__dirname, "resources", "config.xml"), outFile);
        fs.existsSync(outFile).should.equal(true, "We just created it");
        var expectedContents = UtilHelper.readFileContentsSync(path.join(__dirname, "resources", "plist", "expectedEnterpriseApp.plist"));
        var actualContents = UtilHelper.readFileContentsSync(outFile);
        actualContents.should.equal(expectedContents);
    });

    it("should update the App Bundle Version correctly", function (done: MochaDone): void {
        // make a copy of app.plist in the out directory since the function under test will modify it's contents
        var appPlistFile = path.join(__dirname, "out", "plist", "cordovaApp.plist");
        UtilHelper.copyFile(path.join(__dirname, "resources", "plist", "cordovaApp.plist"), appPlistFile).then(function (): void {
            plist.updateAppBundleVersion(appPlistFile, 1234); // buildNumber 1234
            var expectedContents = UtilHelper.readFileContentsSync(path.join(__dirname, "resources", "plist", "expectedCordovaApp.plist")).replace(/\r\n/g, "\n");
            var actualContents = UtilHelper.readFileContentsSync(appPlistFile).replace(/\r\n/g, "\n");
            actualContents.should.equal(expectedContents, "We should have updated the build number");
            done();
        }).done();
    });
});