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
import Create = require ("../cli/create");
import tacoUtils = require ("taco-utils");
import utils = tacoUtils.UtilHelper;
import resources = tacoUtils.ResourcesManager;

describe("taco create", function (): void {
    // Project info
    var testAppId: string = "testId";
    var testAppName: string = "testAppName";

    // Important paths
    var runFolder: string = path.resolve(__dirname, "create_test_run");
    var tacoHome: string = path.join(runFolder, "taco_home");
    var templateCache: string = path.join(tacoHome, "templates");
    var copyFromPath: string = path.resolve(__dirname, "resources", "templates", "testKit", "testTemplate");

    // Paths for the test projects
    var projectPaths: string[] = [
        (path.join(runFolder, "scenario0")),
        (path.join(runFolder, "scenario1")),
        (path.join(runFolder, "scenario2")),
        (path.join(runFolder, "scenario3")),
        (path.join(runFolder, "scenario4")),
        (path.join(runFolder, "scenario5")),
        (path.join(runFolder, "scenario6")),
        (path.join(runFolder, "scenario7")),
        (path.join(runFolder, "scenario8")),
        (path.join(runFolder, "scenario9")),
        (path.join(runFolder, "scenario10")),
        (path.join(runFolder, "scenario11")),
        (path.join(runFolder, "scenario12")),
        (path.join(runFolder, "scenario13")),
        (path.join(runFolder, "scenario14")),
        (path.join(runFolder, "scenario15")),
        (path.join(runFolder, "scenario16"))
    ];

    // Commands for the different end to end scenarios to test
    var scenarios: string[][] = [
        (projectPaths[0] + " --kit 4.0.0-Kit --template typescript " + testAppId + " " + testAppName + " {}").split(" "),
        (projectPaths[1] + " --kit 5.0.0-Kit --template blank " + testAppId + " " + testAppName).split(" "),
        (projectPaths[2] + " --kit 4.2.0-Kit --template typescript " + testAppId).split(" "),
        (projectPaths[3] + " --kit 4.2.0-Kit --template blank").split(" "),
        (projectPaths[4] + " --kit 5.0.0-Kit --template").split(" "),
        (projectPaths[5] + " --kit 4.0.0-Kit").split(" "),
        (projectPaths[6] + " --template typescript").split(" "),
        (projectPaths[7] + " --template").split(" "),
        (projectPaths[8] + " --copy-from " + copyFromPath).split(" "),
        (projectPaths[9] + " --cli 4.2.0").split(" "),
        (projectPaths[10] + " --kit").split(" "),
        (projectPaths[11] + " --template unknown").split(" "),
        (projectPaths[12] + " --kit 5.0.0-Kit --template typescript").split(" "),
        (projectPaths[13] + " --kit 5.0.0-Kit --template typescript --copy-from " + copyFromPath).split(" "),
        (projectPaths[14] + " --kit 5.0.0-Kit --cli 4.2.0").split(" "),
        (projectPaths[15] + " --cli 4.2.0 --template typescript").split(" ")
    ];

    function makeICommandData(args: string[]): tacoUtils.Commands.ICommandData {
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

        return create.run(makeICommandData(scenarios[scenario])).then(function (): void {
            var fileCount: number = countProjectItemsRecursive(projectPaths[scenario]);

            fileCount.should.be.exactly(expectedFileCount);
        });
    }

    function runFailureScenario(scenario: number, expectedError: string, done: MochaDone): void {
        var create = new Create();

        create.run(makeICommandData(scenarios[scenario])).then(function (): void {
            done(new Error("Scenario succeeded when it shouldn't have"));
        }, function (err: string): void {
            try {
                err.should.equal(expectedError);
            } catch (err) {
                done(err);
                return;
            }

            done();
        });
    }

    before(function (): void {
        // Set ResourcesManager to test mode
        resources.UnitTest = true;

        // Create a temporary folder for our test run
        wrench.mkdirSyncRecursive(runFolder, 777);

        // Set a temporary location for taco_home
        process.env["TACO_HOME"] = tacoHome;

        // Make sure the template cache is initially 
        fs.existsSync(templateCache).should.equal(false, "Test template cache must be initially empty for this test suite");
    });

    after(function (done: MochaDone): void {
        rimraf(runFolder, function (): void {
            done();
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
        runFailureScenario(scenario, "ERROR_ID_HERE", done);
    });

    it("should fail: Scenario 11 [path, template (unknown value)]", function (done: MochaDone): void {
        // If a template is not found, create command should fail with an appropriate message
        var scenario: number = 11;
        runFailureScenario(scenario, "command.create.templateNotFound", done);
    });

    it.skip("should fail: Scenario 12 [typescript template with a kit that doesn't have a typescript template]", function (done: MochaDone): void {
        // TODO Enable this test when the real metadata is used; the 5.0.0-Kit will exist and not define a typescript template.
        //
        // Similar to scenario 11 (create command should fail when a template is not found), but for typescript templates we have a specific message
        var scenario: number = 12;
        runFailureScenario(scenario, "command.create.noTypescript", done);
    });

    it("should fail: Scenario 13 [path, kit, template, copy-from]", function (done: MochaDone): void {
        // Create command should fail when both --template and --copy-from are specified
        var scenario: number = 13;
        runFailureScenario(scenario, "command.create.notTemplateIfCustomWww", done);
    });

    it("should fail: Scenario 14 [path, kit, cli]", function (done: MochaDone): void {
        // Create command should fail when both --kit and --cli are specified
        var scenario: number = 14;
        runFailureScenario(scenario, "command.create.notBothCliAndKit", done);
    });

    it("should fail: Scenario 15 [path, cli, template]", function (done: MochaDone): void {
        // Create command should fail when both --cli and --template are specified
        var scenario: number = 15;
        runFailureScenario(scenario, "command.create.notBothTemplateAndCli", done);
    });
});