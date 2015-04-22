/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ * ******************************************************
﻿ */
/// <reference path="../../typings/should.d.ts"/>
/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/tacoUtils.d.ts" />
"use strict";
import should = require ("should");
import mocha = require ("mocha");

import fs = require ("fs");
import mkdirp = require ("mkdirp");
import path = require ("path");
import rimraf = require ("rimraf");

import utils = require ("../tacoPackageLoader");
import TacoPackageLoader = utils.TacoPackageLoader;

describe("TacoPackageLoader", function (): void {
    var testHome = path.resolve(__dirname, "out");
    before(function (): void {
        process.env["TACO_HOME"] = testHome;
        rimraf.sync(testHome);
        mkdirp.sync(testHome);
    });

    // Downloading packages from the internet can take a while.
    this.timeout(10000);

    it("should load packages from npm", function (done: MochaDone): void {
        // is-empty is an arbitrarily chosen fairly small package with no dependencies
        var packageJsonFile = path.join(testHome, "node_modules", "is-empty", "0.0.1", "node_modules", "is-empty", "package.json");
        fs.existsSync(packageJsonFile).should.be.false;
        TacoPackageLoader.lazyRequire<any>("is-empty", "0.0.1").then(function (pkg: any): void {
            should(typeof pkg).not.equal("undefined");
            var funcContents: String = pkg.toString();
            funcContents.should.match(/function isEmpty/);
            fs.existsSync(packageJsonFile).should.be.true;
        }).done(function (): void {
            done();
        }, done);
    });

    it("should load packages from git", function (done: MochaDone): void {
        // is-empty is an arbitrarily chosen fairly small package with no dependencies
        var gitUrl = "https://github.com/ianstormtaylor/is-empty.git";
        var packageJsonFile = path.join(testHome, "node_modules", "is-empty", encodeURIComponent(gitUrl), "node_modules", "is-empty", "package.json");
        fs.existsSync(packageJsonFile).should.be.false;
        TacoPackageLoader.lazyRequire<any>("is-empty", gitUrl).then(function (pkg: any): void {
            should(typeof pkg).not.equal("undefined");
            var funcContents: String = pkg.toString();
            funcContents.should.match(/function isEmpty/);
            fs.existsSync(packageJsonFile).should.be.true;
        }).done(function (): void {
            done();
        }, done);
    });
});