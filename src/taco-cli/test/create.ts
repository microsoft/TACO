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
/// <reference path="../../typings/tacoUtils.d.ts"/>
/// <reference path="../../typings/tacoKits.d.ts"/>

"use strict";
var should_module = require("should"); // Note not import: We don't want to refer to should_module, but we need the require to occur since it modifies the prototype of Object.

import fs = require ("fs");
import mocha = require ("mocha");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import rimraf = require ("rimraf");
import util = require ("util");
import wrench = require ("wrench");

import Create = require ("../cli/create");
import resources = require ("../resources/resourceManager");
import TacoErrorCodes = require ("../cli/tacoErrorCodes");
import tacoKits = require ("taco-kits");
import tacoUtils = require ("taco-utils");

import utils = tacoUtils.UtilHelper;

interface IScenarioList {
    [scenario: number]: string;
}

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
    var successPrefix: string = "success";
    var failurePrefix: string = "failure";
    var successScenarios: IScenarioList = {
        1: util.format("%s --kit 4.0.0-Kit --template typescript %s %s {}", getProjectPath(successPrefix, 1), testAppId, testAppName),
        2: util.format("%s --kit 5.0.0-Kit --template blank %s %s", getProjectPath(successPrefix, 2), testAppId, testAppName),
        3: util.format("%s --kit 4.2.0-Kit --template typescript %s", getProjectPath(successPrefix, 3), testAppId),
        4: util.format("%s --kit 4.2.0-Kit --template blank", getProjectPath(successPrefix, 4)),
        5: util.format("%s --kit 5.0.0-Kit --template", getProjectPath(successPrefix, 5)),
        6: util.format("%s --kit 4.0.0-Kit", getProjectPath(successPrefix, 6)),
        7: util.format("%s --template blank", getProjectPath(successPrefix, 7)),
        8: util.format("%s --template", getProjectPath(successPrefix, 8)),
        9: util.format("%s --copy-from %s", getProjectPath(successPrefix, 9), copyFromPath),
        10: util.format("%s --cli 4.2.0", getProjectPath(successPrefix, 10)),
        11: util.format("%s --unknownParameter", getProjectPath(successPrefix, 11)),
        12: util.format("%s --kit", getProjectPath(successPrefix, 12)),
        13: util.format("%s --template typescript", getProjectPath(successPrefix, 13)),
        14: "--list --kit 4.2.0-Kit",
        15: "--list --kit 2.2.0-Kit",
        16: "--list"
    };
    var failureScenarios: IScenarioList = {
        1: util.format("%s --kit unknown", getProjectPath(failurePrefix, 1)),
        2: util.format("%s --template unknown", getProjectPath(failurePrefix, 2)),
        3: util.format("%s --kit 2.2.0-Kit --template typescript", getProjectPath(failurePrefix, 3)),
        4: util.format("%s --kit 5.0.0-Kit --template typescript --copy-from %s", getProjectPath(failurePrefix, 4), copyFromPath),
        5: util.format("%s --kit 5.0.0-Kit --cli 4.2.0", getProjectPath(failurePrefix, 5)),
        6: util.format("%s --cli 4.2.0 --template typescript", getProjectPath(failurePrefix, 6)),
        7: util.format("%s --kit 4.0.0-Kit --template typescript %s %s {}", getProjectPath(failurePrefix, 7), testAppId, testAppName),
        8: util.format("%s --kit 5.0.0-Kit --copy-from unknownCopyFromPath", getProjectPath(failurePrefix, 8)),
        9: util.format("%s --cli unknownCliVersion", getProjectPath(failurePrefix, 9)),
        10: util.format("%s 42", getProjectPath(failurePrefix, 10)),
        11: "--kit 4.0.0-Kit",
        12: "--list --kit unknown"
    };

    function getProjectPath(suitePrefix: string, scenario: number): string {
        return path.join(runFolder, suitePrefix + scenario);
    }

    function makeICommandData(scenario: number, scenarioList: IScenarioList): tacoUtils.Commands.ICommandData {
        // Get the scenario's command line
        var args: string[] = scenarioList[scenario].split(" ");

        // Build and return the ICommandData object
        return {
            options: {},
            original: args,
            remain: []
        };
    }

    function countProjectItemsRecursive(projectPath: string): number {
        if (!fs.existsSync(projectPath)) {
            return 0;
        }

        var files: string[] = wrench.readdirSyncRecursive(projectPath);

        return files.length;
    }

    function verifyTacoJsonFileContents(projectPath: string, tacoJsonFileContents: string): void {
        var tacoJsonPath: string = path.resolve(projectPath, "taco.json");

        if (!fs.existsSync(tacoJsonPath)) {
            throw new Error("Taco.json file not found");
        }

        var fileContents: string = fs.readFileSync(tacoJsonPath).toString();

        fileContents.should.be.exactly(tacoJsonFileContents);
    }

    function runScenario(scenario: number, expectedFileCount: number, tacoJsonFileContents?: string): Q.Promise<any> {
        var create = new Create();

        return create.run(makeICommandData(scenario, successScenarios)).then(function (): void {
            var projectPath: string = getProjectPath(successPrefix, scenario);
            var fileCount: number = countProjectItemsRecursive(projectPath);

            fileCount.should.be.exactly(expectedFileCount);

            if (tacoJsonFileContents) {
                verifyTacoJsonFileContents(projectPath, tacoJsonFileContents);
            }
        });
    }

    function runFailureScenario(scenario: number, expectedError?: string): Q.Promise<any> {
        var create = new Create();

        return create.run(makeICommandData(scenario, failureScenarios))
            .then(function (): Q.Promise<any> {
                throw new Error("Scenario succeeded when it should have failed");
            }, function (err: any): Q.Promise<any> {
                    if (expectedError) {
                        if (err instanceof tacoUtils.TacoError) {
                            (<tacoUtils.TacoError>err).message.should.equal(expectedError);
                        } else {
                            err.should.equal(expectedError);
                        }
                    }

                return Q.resolve(null);
            });
    }

    before(function (done: MochaDone): void {
        this.timeout(50000);

        // Set ResourcesManager to test mode
        process.env["TACO_UNIT_TEST"] = true;

        // Set a temporary location for taco_home
        process.env["TACO_HOME"] = tacoHome;

        // Delete existing run folder if necessary
        rimraf(runFolder, function (err: Error): void {
            if (err) {
                done(err);
            } else {
                // Create the run folder for our tests
                wrench.mkdirSyncRecursive(runFolder, 511); // 511 decimal is 0777 octal
                done();
            }
        });
    });

    after(function (done: MochaDone): void {
        this.timeout(50000);
        rimraf(runFolder, done);
    });

    describe("Success scenarios", function (): void { // Downloading packages from the internet can take a while.
        this.timeout(50000);

        it("Success scenario 1 [path, id, name, cordovaConfig, kit, template]", function (done: MochaDone): void {
            var scenario: number = 1;

            // Template 4.0.0-Kit typescript: 84 files and 26 folders
            // Kit 4.0.0-Kit: Cordova adds 2 files and 4 folders
            // taco-cli: adds 1 file
            // Total entries: 117
            runScenario(scenario, 117, "{\"kit\":\"4.0.0-Kit\"}").then(done, done);
        });

        it("Success scenario 2 [path, id, name, kit, template]", function (done: MochaDone): void {
            var scenario: number = 2;

            // Template 5.0.0-Kit blank: 64 files and 22 folders
            // Kit 5.0.0-Kit: Cordova adds 1 file and 3 folders
            // taco-cli: adds 1 file
            // Total entries: 91
            runScenario(scenario, 91, "{\"kit\":\"5.0.0-Kit\"}").then(done, done);
        });

        it("Success scenario 3 [path, id, kit, template]", function (done: MochaDone): void {
            var scenario: number = 3;

            // Template default typescript: 84 files and 26 folders
            // Kit 4.2.0-Kit: Cordova adds 2 files and 4 folders
            // taco-cli: adds 1 file
            // Total entries: 117
            runScenario(scenario, 117, "{\"kit\":\"4.2.0-Kit\"}").then(done, done);
        });

        it("Success scenario 4 [path, kit, template]", function (done: MochaDone): void {
            var scenario: number = 4;

            // Template default blank: 64 files and 22 folders
            // Kit 4.2.0-Kit: Cordova adds 2 files and 4 folders
            // taco-cli: adds 1 file
            // Total entries: 93
            runScenario(scenario, 93, "{\"kit\":\"4.2.0-Kit\"}").then(done, done);
        });

        it("Success scenario 5 [path, kit, template (no value)]", function (done: MochaDone): void {
            var scenario: number = 5;

            // Template 5.0.0-Kit blank: 64 files and 22 folders
            // Kit 5.0.0-Kit: Cordova adds 1 file and 3 folders
            // taco-cli: adds 1 file
            // Total entries: 91
            runScenario(scenario, 91, "{\"kit\":\"5.0.0-Kit\"}").then(done, done);
        });

        it("Success scenario 6 [path, kit]", function (done: MochaDone): void {
            var scenario: number = 6;

            // Template 4.0.0-Kit blank: 64 files and 22 folders
            // Kit 4.0.0-Kit: Cordova adds 2 files and 4 folders
            // taco-cli: adds 1 file
            // Total entries: 93
            runScenario(scenario, 93, "{\"kit\":\"4.0.0-Kit\"}").then(done, done);
        });

        it("Success scenario 7 [path, template blank]", function (done: MochaDone): void {
            var scenario: number = 7;

            // Template 5.0.0-Kit blank: 64 files and 22 folders
            // Kit 5.0.0-Kit: Cordova adds 1 file and 3 folders
            // taco-cli: adds 1 file
            // Total entries: 91
            runScenario(scenario, 91, "{\"kit\":\"5.0.0-Kit\"}").then(done, done);
        });

        it("Success scenario 8 [path, template (no value)]", function (done: MochaDone): void {
            var scenario: number = 8;

            // Template 5.0.0-Kit blank: 64 files and 22 folders
            // Kit 5.0.0-Kit: Cordova adds 1 file and 3 folders
            // taco-cli: adds 1 file
            // Total entries: 91
            runScenario(scenario, 91, "{\"kit\":\"5.0.0-Kit\"}").then(done, done);
        });

        it("Success scenario 9 [path, copy-from]", function (done: MochaDone): void {
            var scenario: number = 9;

            // copy-from custom assets: 2 files and 1 folder
            // Kit 5.0.0-Kit: Cordova adds 2 files and 4 folders
            // taco-cli: adds 1 file
            // Total entries: 10
            runScenario(scenario, 10, "{\"kit\":\"5.0.0-Kit\"}").then(done, done);
        });

        it("Success scenario 10 [path, cli]", function (done: MochaDone): void {
            var scenario: number = 10;

            // CLI 4.2.0 + default Cordova project: Cordova adds 6 files and 7 folders
            // taco-cli: adds 1 file
            // Total entries: 14
            runScenario(scenario, 14, "{\"cli\":\"4.2.0\"}").then(done, done);
        });

        it("Success scenario 11 [path, extra unknown parameter]", function (done: MochaDone): void {
            var scenario: number = 11;

            // Template 5.0.0-Kit blank: 64 files and 22 folders
            // Kit 5.0.0-Kit: Cordova adds 1 file and 3 folders
            // taco-cli: adds 1 file
            // Total entries: 91
            runScenario(scenario, 91, "{\"kit\":\"5.0.0-Kit\"}").then(done, done);
        });

        it("Success scenario 12 [path, kit (empty)]", function (done: MochaDone): void {
            var scenario: number = 12;

            // Template 5.0.0-Kit blank: 64 files and 22 folders
            // Kit 5.0.0-Kit: Cordova adds 1 file and 3 folders
            // taco-cli: adds 1 file
            // Total entries: 91
            runScenario(scenario, 91, "{\"kit\":\"5.0.0-Kit\"}").then(done, done);
        });

        it("Success scenario 13 [path, template (typescript)]", function (done: MochaDone): void {
            var scenario: number = 13;

            // Template 5.0.0-Kit typescript: 84 files and 26 folders
            // Kit 5.0.0-Kit: Cordova adds 1 file and 3 folders
            // taco-cli: adds 1 file
            // Total entries: 115
            runScenario(scenario, 115, "{\"kit\":\"5.0.0-Kit\"}").then(done, done);
        });

        it("Success scenario 14 [list, kit (that doesn't have a template override in the metadata)]", function (done: MochaDone): void {
            var scenario: number = 14;

            // Template: none
            // Kit: none
            // taco-cli: none
            // Total entries: 0 (we are only listing templates, no project should be created)
            runScenario(scenario, 0).then(done, done);
        });

        it("Success scenario 15 [list, kit (that has a template override in the metadata)]", function (done: MochaDone): void {
            var scenario: number = 15;

            // Template: none
            // Kit: none
            // taco-cli: none
            // Total entries: 0 (we are only listing templates, no project should be created)
            runScenario(scenario, 0).then(done, done);
        });

        it("Success scenario 16 [list]", function (done: MochaDone): void {
            var scenario: number = 16;

            // Template: none
            // Kit: none
            // taco-cli: none
            // Total entries: 0 (we are only listing templates, no project should be created)
            runScenario(scenario, 0).then(done, done);
        });
    });

    describe("Failure scenarios", function (): void {
        this.timeout(50000);

        it("Failure scenario 1 [path, kit (unknown value)]", function (done: MochaDone): void {     
            // Create command should fail if --kit was specified with an unknown value
            var scenario: number = 1;

            runFailureScenario(scenario, "TacoKitsExceptionInvalidKit").then(done, done);
        });

        it("Failure scenario 2 [path, template (unknown value)]", function (done: MochaDone): void {
            // If a template is not found, create command should fail with an appropriate message
            var scenario: number = 2;

            runFailureScenario(scenario, "TacoKitsExceptionInvalidTemplate").then(done, done);
        });

        it("Failure scenario 3 [path, template (typescript, with a deprecated kit that doesn't have a typescript template)]", function (done: MochaDone): void {
            // Similar to failure scenario 2 (create command should fail when a template is not found), but for typescript templates we have a specific message
            var scenario: number = 3;

            runFailureScenario(scenario, "TacoKitsExceptionTypescriptNotSupported").then(done, done);
        });

        it("Failure scenario 4 [path, kit, template, copy-from]", function (done: MochaDone): void {
            // Create command should fail when both --template and --copy-from are specified
            var scenario: number = 4;

            runFailureScenario(scenario, "CommandCreateNotTemplateIfCustomWww").then(done, done);
        });

        it("Failure scenario 5 [path, kit, cli]", function (done: MochaDone): void {
            // Create command should fail when both --kit and --cli are specified
            var scenario: number = 5;

            runFailureScenario(scenario, "CommandCreateNotBothCliAndKit").then(done, done);
        });

        it("Failure scenario 6 [path, cli, template]", function (done: MochaDone): void {
            // Create command should fail when both --cli and --template are specified
            var scenario: number = 6;

            runFailureScenario(scenario, "CommandCreateNotBothTemplateAndCli").then(done, done);
        });

        it("Failure scenario 7 [path (value is an existing project)]", function (done: MochaDone): void {
            // Create command should fail when the specified path is a non-empty existing folder (Cordova error)
            var scenario: number = 7;
            var copyDest: string = getProjectPath(failurePrefix, scenario);

            wrench.mkdirSyncRecursive(copyDest, 511); // 511 decimal is 0777 octal
            utils.copyRecursive(testTemplateSrc, copyDest)
                .then(function (): Q.Promise<any> {
                    return runFailureScenario(scenario);
                })
                .then(done, done);
        });

        it("Failure scenario 8 [path, copy-from (unknown path)]", function (done: MochaDone): void {
            // Create command should fail when --copy-from is specified with a path that doesn't exist (Cordova error)
            var scenario: number = 8;

            runFailureScenario(scenario).then(done, done);
        });

        it("Failure scenario 9 [path, cli (unknown value)]", function (done: MochaDone): void {
            // Create command should fail when specified cli version doesn't exist
            var scenario: number = 9;

            runFailureScenario(scenario, "PackageLoaderInvalidPackageVersionSpecifier").then(done, done);
        });

        it("Failure scenario 10 [path, appId (invalid value)]", function (done: MochaDone): void {
            // Create command should fail when an invalid app ID is specified (Cordova error)
            var scenario: number = 10;

            runFailureScenario(scenario).then(done, done);
        });

        it("Failure scenario 11 [(NO path), kit]", function (done: MochaDone): void {
            // Cordova should give an error when no path is specified
            var scenario: number = 11;

            runFailureScenario(scenario).then(done, done);
        });

        it("Failure scenario 12 [path, list, kit (unknown value)]", function (done: MochaDone): void {
            // Create command should fail when an invalid kit is given as an option with the --list flag
            var scenario: number = 12;

            runFailureScenario(scenario, "TacoKitsExceptionInvalidKit").then(done, done);
        });
    });
});