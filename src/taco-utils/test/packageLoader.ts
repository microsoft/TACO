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
import Q = require ("q");

import fs = require ("fs");
import mkdirp = require ("mkdirp");
import os = require ("os");
import path = require ("path");
import rimraf = require ("rimraf");

import utils = require ("../tacoPackageLoader");
import TacoPackageLoader = utils.TacoPackageLoader;

describe("TacoPackageLoader", function (): void {
    var testHome: string = path.join(os.tmpdir(), "taco-utils", "packageLoader");
    before(function (): void {
        process.env["TACO_HOME"] = testHome;
        rimraf.sync(testHome);
        mkdirp.sync(testHome);
    });

    after(function (): void {
        rimraf(testHome, function (err: Error): void {/* ignored */ }); // Not sync, and ignore errors
    });

    // Downloading packages from the internet can take a while.
    this.timeout(10000);

    it("should load packages from npm", function (done: MochaDone): void {
        // is-empty is an arbitrarily chosen fairly small package with no dependencies
        var packageJsonFile: string = path.join(testHome, "node_modules", "is-empty", "0.0.1", "node_modules", "is-empty", "package.json");
        fs.existsSync(packageJsonFile).should.be.false;
        TacoPackageLoader.lazyRequire<any>("is-empty", "is-empty@0.0.1").then(function (pkg: any): void {
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
        var gitUrl: string = "https://github.com/ianstormtaylor/is-empty.git";
        var packageJsonFile: string = path.join(testHome, "node_modules", "is-empty", encodeURIComponent(gitUrl), "node_modules", "is-empty", "package.json");
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

    it("should be able to update npm package", function (done: MochaDone): void { // test doesn't expect an updated package but exercises the code paths for any regressions
        var packageName: string = "is-empty";
        var dynamicDependenciesPath: string = path.join(testHome, "dynamicDependencies.json");
        fs.writeFileSync(dynamicDependenciesPath,
            "{\"is-empty\": { \"packageName\": \"is-empty\", \"packageId\": \"is-empty@0.0.1\",\"expirationIntervalInHours\": " + 10 / (60 * 60 * 1000) + "}}");

        TacoPackageLoader.lazyTacoRequire("is-empty", dynamicDependenciesPath)
        .then(function (): Q.Promise<any> {
            return delay(1000);
        })
        .then(function (): Q.Promise<any> {
            return TacoPackageLoader.lazyTacoRequire("is-empty", dynamicDependenciesPath);
        })
        .done(function (): void {
            done();
        }, done);
    });

    it("should update local expirable package", function (done: MochaDone): void { // create a package on the fly
        var packagePath: string = path.join(testHome, "foo");
        mkdirp.sync(packagePath);
        var indexJsPath: string = path.join(packagePath, "index.js");
        fs.writeFileSync(path.join(packagePath, "package.json"), "{ \"name\": \"foo\", \"version\": \"1.0.0\" }");
        fs.writeFileSync(indexJsPath, "module.exports = \"foo\"");

        // add a dynamicDependencies file
        var dynamicDependenciesPath: string = path.join(testHome, "dynamicDependenciesFoo.json");
        fs.writeFileSync(dynamicDependenciesPath, JSON.stringify({
            foo: {
                packageName: "foo",
                localPath: "file://" + packagePath,
                expirationIntervalInHours: 100 / (60 * 60 * 1000)
            }
        }));

        // 1. require package and verify package exports "foo"
        // 2. update package to export "bar"
        // 3. require again after expiration and verify "bar"
        // 4. update pacakge to export "baz"
        // 5. require again before expiration and verify not "bar"
        TacoPackageLoader.lazyTacoRequire("foo", dynamicDependenciesPath)
        .then(function (pkg: any): void {
            should(typeof pkg).not.equal("undefined");
            pkg.toString().should.equal("foo", "expected foo in installed package");
        })
        .then(function (): Q.Promise<any> {
            return Q.denodeify(fs.writeFile)(indexJsPath, "module.exports = \"bar\"");
        })
        .then(function (): Q.Promise<any> {
            return delay(1000);
        })
        .then(function (): Q.Promise<any> {
            return TacoPackageLoader.lazyTacoRequire("foo", dynamicDependenciesPath);
        })
        .then(function (pkg: any): void {
            should(typeof pkg).not.equal("undefined");
            pkg.toString().should.equal("bar", "expected bar in installed package");
        })
        .then(function (): Q.Promise<any> {
            return Q.denodeify(fs.writeFile)(indexJsPath, "module.exports = \"baz\"");
        })
        .then(function (): Q.Promise<any> {
            // Minimal delay, should be less than the expiration interval
            return TacoPackageLoader.lazyTacoRequire("foo", dynamicDependenciesPath);
        })
        .then(function (pkg: any): void {
            should(typeof pkg).not.equal("undefined");
            should(pkg.toString()).not.equal("baz", "Didn't expect baz in installed package");
        })
        .done(function (): void {
            done();
        }, done);
    });

    function delay(ms: number): Q.Promise<any> {
        var deferred: Q.Deferred<any> = Q.defer();
        setTimeout(deferred.resolve, ms);
        return deferred.promise;
    };
});
