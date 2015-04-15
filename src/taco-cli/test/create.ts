/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */
/// <reference path="../../typings/should.d.ts"/>
/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/rimraf.d.ts"/>
/// <reference path="../../typings/wrench.d.ts"/>
/// <reference path="../../typings/taco-utils.d.ts"/>

"use strict";
var should_module = require("should"); // Note not import: We don't want to refer to should_module, but we need the require to occur since it modifies the prototype of Object.

import Q = require ("q");
import rimraf = require ("rimraf");
import wrench = require ("wrench");
import mocha = require ("mocha");
import path = require ("path");
import fs = require ("fs");
import os = require ("os");
import util = require ("util");
import Create = require ("../cli/create");
import tacoUtils = require ("taco-utils");
import utils = tacoUtils.UtilHelper;
import resources = tacoUtils.ResourcesManager;

describe("taco create", function (): void {
    // Project info
    var testAppId: string = "testId";
    var testAppName: string = "testAppName";
    var testTemplateId: string = "testTemplate";
    var testKitId: string = "testKit";

    // Important paths
    var runFolder: string = path.resolve(os.tmpdir(), "taco_cli_create_test_run");
    var tacoHome: string = path.join(runFolder, "taco_home");
    var templateCache: string = path.join(tacoHome, "templates");
    var copyFromPath: string = path.resolve(__dirname, "resources", "templates", "testKit", "testTemplate");
    var testTemplateKitSrc: string = path.resolve(__dirname, "resources", "templates", testKitId);
    var testTemplateSrc: string = path.join(testTemplateKitSrc, testTemplateId);

    // Commands for the different end to end scenarios to test
    var scenarios: string[] = [
        util.format("--kit 4.0.0-Kit --template typescript %s %s {}", testAppId, testAppName),
        util.format("--kit 5.0.0-Kit --template blank %s %s", testAppId, testAppName),
        util.format("--kit 4.2.0-Kit --template typescript %s", testAppId),
        "--kit 4.2.0-Kit --template blank",
        "--kit 5.0.0-Kit --template",
        "--kit 4.0.0- Kit",
        "--template typescript",
        "--template",
        util.format("--copy-from %s", copyFromPath),
        "--cli 4.2.0",
        "--kit",
        "--template unknown",
        "--kit 5.0.0-Kit --template typescript",
        util.format("--kit 5.0.0-Kit --template typescript --copy-from %s", copyFromPath),
        "--kit 5.0.0-Kit --cli 4.2.0",
        "--cli 4.2.0 --template typescript",
        util.format("--kit 4.0.0-Kit --template typescript %s %s {}", testAppId, testAppName),
        "--kit 5.0.0-Kit --copy-from unknownCopyFromPath",
        "--cli unknownCliVersion",
        "--unknownParameter",
        "42"
    ];

    function getProjectPath(scenario: number): string {
        return path.join(runFolder, "scenario" + scenario);
    }

    function makeICommandData(scenario: number): tacoUtils.Commands.ICommandData {
        // Get the scenario's command line
        var args: string[] = scenarios[scenario].split(" ");

        // Add the project creation path for the scenario to the front of the command line
        args.unshift(getProjectPath(scenario));

        // Build and return the ICommandData object
        return {
            options: {},
            original: args,
            remain: []
        };
    }

    function countProjectItemsRecursive(projectPath: string): number {
        if (!fs.existsSync(projectPath)) {
            throw new Error("Can't count project items; the specified path does not exist");
        }

        var files: string[] = wrench.readdirSyncRecursive(projectPath);

        return files.length;
    }

    function runScenario(scenario: number, expectedFileCount: number): Q.Promise<any> {
        var create = new Create();

        return create.run(makeICommandData(scenario)).then(function (): void {
            var fileCount: number = countProjectItemsRecursive(getProjectPath(scenario));

            fileCount.should.be.exactly(expectedFileCount);
        });
    }

    function runFailureScenario(scenario: number, expectedError?: string): Q.Promise<any> {
        var create = new Create();

        return create.run(makeICommandData(scenario)).then(function (): Q.Promise<any> {
            throw new Error("Scenario succeeded when it shouldn't have");
        }, function (err: string): Q.Promise<any> {
            if (expectedError) {
                err.should.equal(expectedError);
            }

            return Q.resolve(null);
        });
    }

    before(function (done: MochaDone): void {
        // Set ResourcesManager to test mode
        resources.UnitTest = true;

        // Set a temporary location for taco_home
        process.env["TACO_HOME"] = tacoHome;

        // Delete existing run folder if necessary
        rimraf(runFolder, function (err: Error): void {
            if (err) {
                done(err);
            } else {
                // Create the run folder for our tests
                wrench.mkdirSyncRecursive(runFolder, 777);
                done();
            }
        });
    });

    after(function (done: MochaDone): void {
        rimraf(runFolder, function (err: Error): void {
            if (err) {
                done(err);
            } else {
                done();
            }
        });
    });

    it("should succeed: Scenario 0 [path, id, name, cordovaConfig, kit, template]", function (done: MochaDone): void {
        var scenario: number = 0;

        // Template that will be used: 4.0.0-Kit typescript
        // The template has 84 files and 26 folders, and Cordova will add 1 file and 3 folders, for a total of 114 entries
        runScenario(scenario, 114).then(done, done);
    });

    it("should succeed: Scenario 1 [path, id, name, kit, template]", function (done: MochaDone): void {
        var scenario: number = 1;

        // Template that will be used: 4.0.0-Kit blank
        // The template has 64 files and 22 folders, and Cordova will add 1 file and 3 folders, for a total of 90 entries
        runScenario(scenario, 90).then(done, done);
    });

    it("should succeed: Scenario 2 [path, id, kit, template]", function (done: MochaDone): void {
        var scenario: number = 2;

        // Template that will be used: default typescript
        // The template has 84 files and 26 folders, and Cordova will add 1 file and 3 folders, for a total of 114 entries
        runScenario(scenario, 114).then(done, done);
    });

    it("should succeed: Scenario 3 [path, kit, template]", function (done: MochaDone): void {
        var scenario: number = 3;

        // Template that will be used: default blank
        // The template has 64 files and 22 folders, and Cordova will add 1 file and 3 folders, for a total of 90 entries
        runScenario(scenario, 90).then(done, done);
    });

    it("should succeed: Scenario 4 [path, kit, template (no value)]", function (done: MochaDone): void {
        var scenario: number = 4;

        // Template that will be used: 5.0.0-Kit blank
        // The template has 64 files and 22 folders, and Cordova will add 1 file and 3 folders, for a total of 90 entries
        runScenario(scenario, 90).then(done, done);
    });

    it("should succeed: Scenario 5 [path, kit]", function (done: MochaDone): void {
        var scenario: number = 5;

        // Template that will be used: 4.0.0-Kit blank
        // The template has 64 files and 22 folders, and Cordova will add 1 file and 3 folders, for a total of 90 entries
        runScenario(scenario, 90).then(done, done);
    });

    it("should succeed: Scenario 6 [path, template]", function (done: MochaDone): void {
        var scenario: number = 6;

        // Template that will be used: 4.0.0-Kit typescript
        // The template has 84 files and 26 folders, and Cordova will add 1 file and 3 folders, for a total of 114 entries
        runScenario(scenario, 114).then(done, done);
    });

    it("should succeed: Scenario 7 [path, template (no value)]", function (done: MochaDone): void {
        var scenario: number = 7;

        // Template that will be used: 4.0.0-Kit blank
        // The template has 64 files and 22 folders, and Cordova will add 1 file and 3 folders, for a total of 90 entries
        runScenario(scenario, 90).then(done, done);
    });

    it("should succeed: Scenario 8 [path, copy-from]", function (done: MochaDone): void {
        var scenario: number = 8;

        // The copy-from source has 2 files and 1 folder, and Cordova will add 2 files and 4 folders, for a total of 9 entries
        runScenario(scenario, 9).then(done, done);
    });

    it("should succeed: Scenario 9 [path, cli]", function (done: MochaDone): void {
        var scenario: number = 9;

        // The default cordova project has 6 files and 7 folders, for a total of 13 entries
        runScenario(scenario, 13).then(done, done);
    });

    it.skip("should fail: Scenario 10 [path, kit (no value)]", function (done: MochaDone): void {
        // TODO Complete this test after kit story is checked in.
        //
        // Create command should fail if --kit was specified with no value
        var scenario: number = 10;

        runFailureScenario(scenario, "ERROR_ID_HERE").then(done, done);
    });

    it("should fail: Scenario 11 [path, template (unknown value)]", function (done: MochaDone): void {
        // If a template is not found, create command should fail with an appropriate message
        var scenario: number = 11;

        runFailureScenario(scenario, "command.create.templateNotFound").then(done, done);
    });

    it.skip("should fail: Scenario 12 [typescript template with a kit that doesn't have a typescript template]", function (done: MochaDone): void {
        // TODO Enable this test when the real metadata is used; the 5.0.0-Kit will exist and not define a typescript template.
        //
        // Similar to scenario 11 (create command should fail when a template is not found), but for typescript templates we have a specific message
        var scenario: number = 12;

        runFailureScenario(scenario, "command.create.noTypescript").then(done, done);
    });

    it("should fail: Scenario 13 [path, kit, template, copy-from]", function (done: MochaDone): void {
        // Create command should fail when both --template and --copy-from are specified
        var scenario: number = 13;

        runFailureScenario(scenario, "command.create.notTemplateIfCustomWww").then(done, done);
    });

    it("should fail: Scenario 14 [path, kit, cli]", function (done: MochaDone): void {
        // Create command should fail when both --kit and --cli are specified
        var scenario: number = 14;

        runFailureScenario(scenario, "command.create.notBothCliAndKit").then(done, done);
    });

    it("should fail: Scenario 15 [path, cli, template]", function (done: MochaDone): void {
        // Create command should fail when both --cli and --template are specified
        var scenario: number = 15;

        runFailureScenario(scenario, "command.create.notBothTemplateAndCli").then(done, done);
    });

    it("should fail: Scenario 16 [path (value is an existing project)]", function (done: MochaDone): void {
        // Create command should fail when the specified path is a non-empty existing folder (Cordova error)
        var scenario: number = 16;
        var copyDest: string = getProjectPath(scenario);

        wrench.mkdirSyncRecursive(copyDest, 777);
        utils.copyRecursive(testTemplateSrc, copyDest).then(function (): void {
            runFailureScenario(scenario).then(done, done);
        });
    });

    it("should fail: Scenario 17 [copy-from (unknown path)]", function (done: MochaDone): void {
        // Create command should fail when --copy-from is specified with a path that doesn't exist (Cordova error)
        var scenario: number = 17;

        runFailureScenario(scenario).then(done, done);
    });

    it.skip("should fail: Scenario 18 [cli (unknown value)]", function (done: MochaDone): void {
        // TODO Enable this test when kits story is checked in and cli validation is in place
        //
        // Create command should fail when specified cli version doesn't exist
        var scenario: number = 18;

        runFailureScenario(scenario, "ERROR_ID_HERE").then(done, done);
    });

    it("should succeed: Scenario 19 [path, extra unknown parameter]", function (done: MochaDone): void {
        var scenario: number = 19;

        // Template that will be used: default blank
        // The template has 64 files and 22 folders, and Cordova will add 1 file and 3 folders, for a total of 90 entries
        runScenario(scenario, 90).then(done, done);
    });

    it("should fail: Scenario 20 [path, appId (invalid value)]", function (done: MochaDone): void {
        // Create command should fail when an invalid app ID is specified (Cordova error)
        var scenario: number = 20;

        runFailureScenario(scenario).then(done, done);
    });
});