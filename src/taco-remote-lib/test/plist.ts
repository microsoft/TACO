/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */
/// <reference path="../../typings/mocha.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/tacoUtils.d.ts" />
"use strict";

/* tslint:disable:no-var-requires */
// var require needed for should module to work correctly
// Note not import: We don't want to refer to shouldModule, but we need the require to occur since it modifies the prototype of Object.
var shouldModule = require("should");
/* tslint:enable:no-var-requires */

import fs = require ("fs");
import os = require ("os");
import path = require ("path");
import rimraf = require ("rimraf");

import plist = require ("../ios/plist");
import utils = require ("taco-utils");

import UtilHelper = utils.UtilHelper;

describe("plist", function (): void {
    var testDir = path.join(os.tmpdir(), "taco-remote-lib", "plist");
    before(function (): void {
        UtilHelper.createDirectoryIfNecessary(path.join(testDir, "plist"));
    });

    after(function (): void {
        rimraf(testDir, function (err: Error): void {/* ignored */ }); // Not sync, and ignore errors
    });

    it("should create plist files correctly", function (): void {
        var outFile = path.join(testDir, "plist", "actualEnterpriseApp.plist");
        plist.createEnterprisePlist(path.join(__dirname, "resources", "config.xml"), outFile);
        fs.existsSync(outFile).should.equal(true, "We just created it");
        var expectedContents = UtilHelper.readFileContentsSync(path.join(__dirname, "resources", "plist", "expectedEnterpriseApp.plist"));
        var actualContents = UtilHelper.readFileContentsSync(outFile);
        actualContents.should.equal(expectedContents);
    });

    it("should update the App Bundle Version correctly", function (done: MochaDone): void {
        // make a copy of app.plist in the out directory since the function under test will modify it's contents
        var appPlistFile = path.join(testDir, "plist", "cordovaApp.plist");
        UtilHelper.copyFile(path.join(__dirname, "resources", "plist", "cordovaApp.plist"), appPlistFile).then(function (): void {
            plist.updateAppBundleVersion(appPlistFile, 1234); // buildNumber 1234
            var expectedContents = UtilHelper.readFileContentsSync(path.join(__dirname, "resources", "plist", "expectedCordovaApp.plist")).replace(/\r\n/g, "\n");
            var actualContents = UtilHelper.readFileContentsSync(appPlistFile).replace(/\r\n/g, "\n");
            actualContents.should.equal(expectedContents, "We should have updated the build number");
            done();
        }).done();
    });
});
