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

var should = require("should"); // Note not import: We don't want to refer to should, but we need the require to occur since it modifies the prototype of Object.

import del = require ("del");
import fs = require ("fs");
import mocha = require ("mocha");
import os = require ("os");
import path = require ("path");
import tacoUtils = require ("taco-utils");
import Q = require ("q");
import rimraf = require ("rimraf");
import util = require ("util");

import createMod = require ("../cli/create");
import kitMod = require ("../cli/kit");
import kitHelper = require ("../cli/utils/kitHelper");
import TacoUtility = require ("taco-utils");

import utils = TacoUtility.UtilHelper;

import commands = tacoUtils.Commands.ICommandData;

interface IKeyValuePair<T> {
    [key: string]: T;
}

describe("Kit", function (): void {
    this.timeout(20000);

    function kitRun(args: string[] = []): Q.Promise<TacoUtility.ICommandTelemetryProperties> {
        var kit = new kitMod();
        var data: commands = {
            options: {},
            original: args,
            remain: args
        };

        return kit.run(data);
    }

    var previous: boolean;
    var runFolder: string = path.resolve(os.tmpdir(), "taco_cli_kit");
    var tacoHome: string = path.join(runFolder, "taco_home");
    var cliProjectDir: string = "cliProject";
    var kitProjectDir: string = "kitProject";
    var tempJson: string = path.resolve(runFolder, "temp.json");
    var originalCwd: string;

    function createProject(args: string[], projectDir: string): Q.Promise<any> {
        var create = new createMod();
        // Create a dummy test project with no platforms added
        utils.createDirectoryIfNecessary(tacoHome);
        process.chdir(tacoHome);
        return Q.denodeify(del)(projectDir).then(function (): Q.Promise<any> {
            return create.run({
                options: {},
                original: args,
                remain: args
            });
        }).then(function (): void {
            var projectPath: string = path.join(tacoHome, projectDir);
            process.chdir(projectPath);
        });
    }

    function createCliProject(cli: string): Q.Promise<any> {
         return createProject(["cliProject", "--cordova", cli], cliProjectDir);
    }

    function createKitProject(kit: string): Q.Promise<any> {
        return createProject(["kitProject", "--kit", kit], kitProjectDir);
    }

    function runKitCommandAndVerifyTacoJsonContents(args: string[],
        tacoJsonPath: string, tacoJsonKeyValues: IKeyValuePair<string>): Q.Promise<TacoUtility.ICommandTelemetryProperties> {
        return kitRun(args)
        .then((telemetryParameters: TacoUtility.ICommandTelemetryProperties) => {
            fs.existsSync(tacoJsonPath).should.be.true;

            var tacoJson: IKeyValuePair<string> = require(tacoJsonPath);

            tacoJsonKeyValues.should.be.eql(tacoJson);
            return telemetryParameters;
        });
    }

    before(() => {
        originalCwd = process.cwd();

        previous = process.env["TACO_UNIT_TEST"];
        process.env["TACO_UNIT_TEST"] = true;

        // Use a dummy home location so we don't trash any real configurations
        process.env["TACO_HOME"] = tacoHome;

        // Force KitHelper to fetch the package fresh
        kitHelper.kitPackagePromise = null;

        this.timeout(30000);
        rimraf.sync(runFolder);
    });

    after((done: MochaDone) => {
        process.env["TACO_UNIT_TEST"] = previous;
        process.chdir(originalCwd);
        kitHelper.kitPackagePromise = null;
        rimraf(runFolder, function (err: Error): void { done(); }); // ignore errors
    });

    it("'taco kit' should not throw any error", function (done: MochaDone): void {
        kitRun()
            .done((telemetryParameters: TacoUtility.ICommandTelemetryProperties) => {
                var expected = { subCommand: { isPii: false, value: "list" } };
                telemetryParameters.should.be.eql(expected);
                done();
            }, function (err: tacoUtils.TacoError): void {
                done(err);
            });
    });

    it("'taco kit list' should not throw any error", function (done: MochaDone): void {
        kitRun(["list"])
            .done((telemetryParameters: TacoUtility.ICommandTelemetryProperties) => {
                var expected = { subCommand: { isPii: false, value: "list" } };
                telemetryParameters.should.be.eql(expected);
                done();
            }, function (err: tacoUtils.TacoError): void {
                done(err);
            });
    });

    it("'taco kit list --kit {kit-ID}' should not throw any error", function (done: MochaDone): void {
        kitRun(["list", "--kit", "5.1.1-Kit"])
            .done((telemetryParameters: TacoUtility.ICommandTelemetryProperties) => {
                var expected = {
                    subCommand: { isPii: false, value: "list" },
                    "options.kit": { isPii: false, value: "5.1.1-Kit" }
                };
                telemetryParameters.should.be.eql(expected);
                done();
            }, function (err: tacoUtils.TacoError): void {
                done(err);
            });
    });

    it("'taco kit list --json {path}' should generate the JSON", function (done: MochaDone): void {
        kitRun(["list", "--json", tempJson])
            .done((telemetryParameters: TacoUtility.ICommandTelemetryProperties) => {
                fs.existsSync(tempJson).should.be.true;
                var expected = {
                    subCommand: { isPii: false, value: "list" },
                    "options.json": { isPii: true, value: tempJson }
                };
                telemetryParameters.should.be.eql(expected);
                done();
            }, function (err: tacoUtils.TacoError): void {
                done(err);
            });
    });

    describe("'taco kit select' to convert a Kit project to a cli project works as expected", function (): void {
        var kitProjectpath: string = path.join(tacoHome, kitProjectDir);
        var tacoJsonPath: string = path.resolve(kitProjectpath, "taco.json");
        var expectedCliTacoJsonKeyValues: IKeyValuePair<string> = {
            "cordova-cli": "5.1.1"
        };

        this.timeout(30000);

        before(function (done: MochaDone): void {
            createKitProject("5.1.1-Kit")
            .done(function (): void {
                process.chdir(kitProjectpath);
                done();
            });
        });

        after(function (done: MochaDone): void {
            this.timeout(30000);
            process.chdir(tacoHome);
            rimraf(kitProjectpath, function (err: Error): void { done(); }); // ignore errors
        });

        it("'taco kit select --cordova {CLI-VERSION}' should execute with no errors", function (done: MochaDone): void {
            runKitCommandAndVerifyTacoJsonContents(["select", "--cordova", "5.1.1"], tacoJsonPath, expectedCliTacoJsonKeyValues)
                .then((telemetryParameters: TacoUtility.ICommandTelemetryProperties) => {
                    var expected = {
                        subCommand: { isPii: false, value: "select" },
                        "options.cordova": { isPii: false, value: "5.1.1" }
                    };
                    telemetryParameters.should.be.eql(expected);
                })
                .done(() => done(), done);
        });
    });

    describe("'taco kit select' to convert CLI project to a Kit project works as expected", function (): void {
        var cliProjectpath: string = path.join(tacoHome, cliProjectDir);
        var tacoJsonPath: string = path.resolve(cliProjectpath, "taco.json");
        var expectedKitTacoJsonKeyValues: IKeyValuePair<string> = {
            kit: "5.1.1-Kit", "cordova-cli": "5.1.1"
        };

        this.timeout(30000);

        before(function (done: MochaDone): void {
            createCliProject("5.1.1")
            .done(function (): void {
                process.chdir(cliProjectpath);
                done();
            }, done);
        });

        after(function (done: MochaDone): void {
            this.timeout(30000);
            process.chdir(tacoHome);
            rimraf(cliProjectpath, function (err: Error): void { done(); }); // ignore errors
        });

        it("'taco kit select --kit {kit-ID}' should execute with no errors", function (done: MochaDone): void {
            runKitCommandAndVerifyTacoJsonContents(["select", "--kit", "5.1.1-Kit"], tacoJsonPath, expectedKitTacoJsonKeyValues)
                .then((telemetryParameters: TacoUtility.ICommandTelemetryProperties) => {
                    var expected = {
                        subCommand: { isPii: false, value: "select" },
                        "options.kit": { isPii: false, value: "5.1.1-Kit" }
                    };
                    telemetryParameters.should.be.eql(expected);
                })
                .done(() => done(), done);
        });
    });
});
