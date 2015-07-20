/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
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
import kitHelper = require ("../cli/utils/KitHelper");
import resources = require ("../resources/resourceManager");
import TacoErrorCodes = require ("../cli/tacoErrorCodes");
import tacoKits = require ("taco-kits");
import tacoUtils = require ("taco-utils");
import TemplateManager = require ("../cli/utils/templateManager");
import ms = require ("./utils/memoryStream");

import TacoKitsErrorCodes = tacoKits.TacoErrorCode;
import TacoUtilsErrorCodes = tacoUtils.TacoErrorCode;
import utils = tacoUtils.UtilHelper;
import LogFormatHelper = tacoUtils.LogFormatHelper;

interface IScenarioList {
    [scenario: number]: string;
}

describe("taco create", function (): void {
    // Test constants
    var createTimeout: number = 60000;
    var tacoFileCount: number = 1;
    var cordovaDefaultProjectFileCount: number = 13; // 6 files and 7 folders

    // The following numbers are for: "plugins", "hooks", "platforms" and ".cordova" folders, and "hooks\readme.md" and ".cordova\cordova.config" files. If our templates ever start to include
    // these files, then to avoid double counting them, we must reduce the counts in this dictionary.
    var cordovaFileCounts: { [kitId: string]: number } = {
        "4.2.0-Kit": 6, // 2 file and 4 folders
        "4.3.0-Kit": 6, // 2 file and 4 folders
        "4.3.1-Kit": 4, // 1 file and 3 folders (no ".cordova\" and ".cordova\cordova.config") 
        "5.0.0-Kit": 4 // 1 file and 3 folders 
    };

    // Persistent TemplateManager to count template entries
    var templateManager: TemplateManager;

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
        1: util.format("%s --kit 4.3.1-Kit --template typescript %s %s {}", getProjectPath(successPrefix, 1), testAppId, testAppName),
        2: util.format("%s --kit 5.0.0-Kit --template blank %s %s", getProjectPath(successPrefix, 2), testAppId, testAppName),
        3: util.format("%s --kit 4.2.0-Kit --template typescript %s", getProjectPath(successPrefix, 3), testAppId),
        4: util.format("%s --kit 4.2.0-Kit --template blank", getProjectPath(successPrefix, 4)),
        5: util.format("%s --kit 5.0.0-Kit --template", getProjectPath(successPrefix, 5)),
        6: util.format("%s --kit 4.3.1-Kit", getProjectPath(successPrefix, 6)),
        7: util.format("%s --template blank", getProjectPath(successPrefix, 7)),
        8: util.format("%s --template", getProjectPath(successPrefix, 8)),
        9: util.format("%s --copy-from %s", getProjectPath(successPrefix, 9), copyFromPath),
        10: util.format("%s --cli 4.2.0", getProjectPath(successPrefix, 10)),
        11: util.format("%s --unknownParameter", getProjectPath(successPrefix, 11)),
        12: util.format("%s --kit", getProjectPath(successPrefix, 12)),
        13: util.format("%s --template typescript", getProjectPath(successPrefix, 13))
    };
    var failureScenarios: IScenarioList = {
        1: util.format("%s --kit unknown", getProjectPath(failurePrefix, 1)),
        2: util.format("%s --template unknown", getProjectPath(failurePrefix, 2)),
        3: util.format("%s --kit 4.3.0-Kit --template typescript", getProjectPath(failurePrefix, 3)),
        4: util.format("%s --kit 5.0.0-Kit --template typescript --copy-from %s", getProjectPath(failurePrefix, 4), copyFromPath),
        5: util.format("%s --kit 5.0.0-Kit --cli 4.2.0", getProjectPath(failurePrefix, 5)),
        6: util.format("%s --cli 4.2.0 --template typescript", getProjectPath(failurePrefix, 6)),
        7: util.format("%s --kit 4.3.1-Kit --template typescript %s %s {}", getProjectPath(failurePrefix, 7), testAppId, testAppName),
        8: util.format("%s --kit 5.0.0-Kit --copy-from unknownCopyFromPath", getProjectPath(failurePrefix, 8)),
        9: util.format("%s --cli unknownCliVersion", getProjectPath(failurePrefix, 9)),
        10: util.format("%s 42", getProjectPath(failurePrefix, 10)),
        11: "",
        12: util.format("%s/invalid/project/path", getProjectPath(failurePrefix, 12)),
        13: util.format("%s", getProjectPath(failurePrefix, 13)),
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

    function runScenarioWithExpectedFileCount(scenario: number, expectedFileCount: number, tacoJsonFileContents?: string): Q.Promise<any> {
        var create = new Create();

        return create.run(makeICommandData(scenario, successScenarios))
            .then(function (): void {
                var projectPath: string = getProjectPath(successPrefix, scenario);
                var fileCount: number = countProjectItemsRecursive(projectPath);

                fileCount.should.be.exactly(expectedFileCount);

                if (tacoJsonFileContents) {
                    verifyTacoJsonFileContents(projectPath, tacoJsonFileContents);
                }
            });
    }

    function runScenario(scenario: number, kitUsed: string, templateUsed: string, tacoJsonFileContents?: string): Q.Promise<any> {
        return templateManager.getTemplateEntriesCount(kitUsed, templateUsed)
            .then(function (templateEntries: number): Q.Promise<any> {
                var totalEntries: number = templateEntries + tacoFileCount + cordovaFileCounts[kitUsed];

                return runScenarioWithExpectedFileCount(scenario, totalEntries, tacoJsonFileContents);
            });
    }

    function runFailureScenario<T>(scenario: number, expectedErrorCode?: T): Q.Promise<any> {
        var create = new Create();

        return create.run(makeICommandData(scenario, failureScenarios))
            .then(function (): Q.Promise<any> {
                throw new Error("Scenario succeeded when it should have failed");
            }, function (err: tacoUtils.TacoError): Q.Promise<any> {
                if (expectedErrorCode) {
                    err.errorCode.should.equal(expectedErrorCode);
                }

                return Q.resolve(null);
            });
    }

    before(function (done: MochaDone): void {
        this.timeout(createTimeout);

        // Set ResourcesManager to test mode
        process.env["TACO_UNIT_TEST"] = true;

        // Set a temporary location for taco_home
        process.env["TACO_HOME"] = tacoHome;

        // Force KitHelper to fetch the package fresh
        kitHelper.KitPackagePromise = null;
        
        // Instantiate the persistent templateManager
        templateManager = new TemplateManager(kitHelper);

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
        this.timeout(createTimeout);
        kitHelper.KitPackagePromise = null;
        rimraf(runFolder, done);
    });

    describe("Success scenarios", function (): void { // Downloading packages from the internet can take a while.
        this.timeout(createTimeout);

        it("Success scenario 1 [path, id, name, cordovaConfig, kit, template]", function (done: MochaDone): void {
            var scenario: number = 1;

            // Should use kit 4.3.1-Kit and template typescript
            runScenario(scenario, "4.3.1-Kit", "typescript", "{\"kit\":\"4.3.1-Kit\"}").then(done, done);
        });

        it("Success scenario 2 [path, id, name, kit, template]", function (done: MochaDone): void {
            var scenario: number = 2;

            // Should use kit 5.0.0-Kit and template blank
            runScenario(scenario, "5.0.0-Kit", "blank", "{\"kit\":\"5.0.0-Kit\"}").then(done, done);
        });

        it("Success scenario 3 [path, id, kit, template]", function (done: MochaDone): void {
            var scenario: number = 3;

            // Should use kit 4.2.0-Kit and template typescript
            runScenario(scenario, "4.2.0-Kit", "typescript", "{\"kit\":\"4.2.0-Kit\"}").then(done, done);
        });

        it("Success scenario 4 [path, kit, template]", function (done: MochaDone): void {
            var scenario: number = 4;

            // Should use kit 4.2.0-Kit and template blank
            runScenario(scenario, "4.2.0-Kit", "blank", "{\"kit\":\"4.2.0-Kit\"}").then(done, done);
        });

        it("Success scenario 5 [path, kit, template (no value)]", function (done: MochaDone): void {
            var scenario: number = 5;

            // Should use kit 5.0.0-Kit and template blank
            runScenario(scenario, "5.0.0-Kit", "blank", "{\"kit\":\"5.0.0-Kit\"}").then(done, done);
        });

        it("Success scenario 6 [path, kit]", function (done: MochaDone): void {
            var scenario: number = 6;

            // Should use kit 4.3.1-Kit and template blank
            runScenario(scenario, "4.3.1-Kit", "blank", "{\"kit\":\"4.3.1-Kit\"}").then(done, done);
        });

        it("Success scenario 7 [path, template]", function (done: MochaDone): void {
            var scenario: number = 7;

            // Should use kit 5.0.0-Kit and template blank
            runScenario(scenario, "5.0.0-Kit", "blank", "{\"kit\":\"5.0.0-Kit\"}").then(done, done);
        });

        it("Success scenario 8 [path, template (no value)]", function (done: MochaDone): void {
            var scenario: number = 8;

            // Should use kit 5.0.0-Kit and template blank
            runScenario(scenario, "5.0.0-Kit", "blank", "{\"kit\":\"5.0.0-Kit\"}").then(done, done);
        });

        it("Success scenario 9 [path, copy-from]", function (done: MochaDone): void {
            var scenario: number = 9;

            // copy-from custom assets: 2 files and 1 folder
            // Kit 5.0.0-Kit: Cordova adds 2 files and 4 folders
            var totalEntries = 9 + tacoFileCount;

            runScenarioWithExpectedFileCount(scenario, totalEntries, "{\"kit\":\"5.0.0-Kit\"}").then(done, done);
        });

        it("Success scenario 10 [path, cli]", function (done: MochaDone): void {
            var scenario: number = 10;

            // CLI 4.2.0 + default Cordova project
            // taco-cli: adds 1 file
            var totalEntries = cordovaDefaultProjectFileCount + tacoFileCount;

            runScenarioWithExpectedFileCount(scenario, totalEntries, "{\"cli\":\"4.2.0\"}").then(done, done);
        });

        it("Success scenario 11 [path, extra unknown parameter]", function (done: MochaDone): void {
            var scenario: number = 11;

            // Should use kit 5.0.0-Kit and template blank
            runScenario(scenario, "5.0.0-Kit", "blank", "{\"kit\":\"5.0.0-Kit\"}").then(done, done);
        });

        it("Success scenario 12 [path, kit (empty)]", function (done: MochaDone): void {
            var scenario: number = 12;

            // Should use kit 5.0.0-Kit and template blank
            runScenario(scenario, "5.0.0-Kit", "blank", "{\"kit\":\"5.0.0-Kit\"}").then(done, done);
        });

        it("Success scenario 13 [path, template (typescript)]", function (done: MochaDone): void {
            var scenario: number = 13;

            // Should use kit 5.0.0-Kit and template typescript
            runScenario(scenario, "5.0.0-Kit", "typescript", "{\"kit\":\"5.0.0-Kit\"}").then(done, done);
        });
    });

    describe("Failure scenarios", function (): void {
        this.timeout(createTimeout);

        it("Failure scenario 1 [path, kit (unknown value)]", function (done: MochaDone): void {     
            // Create command should fail if --kit was specified with an unknown value
            var scenario: number = 1;

            runFailureScenario<TacoKitsErrorCodes>(scenario, TacoKitsErrorCodes.TacoKitsExceptionInvalidKit).then(done, done);
        });

        it("Failure scenario 2 [path, template (unknown value)]", function (done: MochaDone): void {
            // If a template is not found, create command should fail with an appropriate message
            var scenario: number = 2;

            runFailureScenario<TacoKitsErrorCodes>(scenario, TacoKitsErrorCodes.TacoKitsExceptionInvalidTemplate).then(done, done);
        });

        it("Failure scenario 3 [path, template (typescript, with a deprecated kit that doesn't have a typescript template)]", function (done: MochaDone): void {
            // Similar to failure scenario 2 (create command should fail when a template is not found), but for typescript templates we have a specific message
            var scenario: number = 3;

            runFailureScenario<TacoKitsErrorCodes>(scenario, TacoKitsErrorCodes.TacoKitsExceptionTypescriptNotSupported).then(done, done);
        });

        it("Failure scenario 4 [path, kit, template, copy-from]", function (done: MochaDone): void {
            // Create command should fail when both --template and --copy-from are specified
            var scenario: number = 4;

            runFailureScenario<TacoErrorCodes>(scenario, TacoErrorCodes.CommandCreateNotTemplateIfCustomWww).then(done, done);
        });

        it("Failure scenario 5 [path, kit, cli]", function (done: MochaDone): void {
            // Create command should fail when both --kit and --cli are specified
            var scenario: number = 5;

            runFailureScenario<TacoErrorCodes>(scenario, TacoErrorCodes.CommandCreateNotBothCliAndKit).then(done, done);
        });

        it("Failure scenario 6 [path, cli, template]", function (done: MochaDone): void {
            // Create command should fail when both --cli and --template are specified
            var scenario: number = 6;

            runFailureScenario<TacoErrorCodes>(scenario, TacoErrorCodes.CommandCreateNotBothTemplateAndCli).then(done, done);
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

            runFailureScenario<TacoUtilsErrorCodes>(scenario, TacoUtilsErrorCodes.PackageLoaderInvalidPackageVersionSpecifier).then(done, done);
        });

        it("Failure scenario 10 [path, appId (invalid value)]", function (done: MochaDone): void {
            // Create command should fail when an invalid app ID is specified (Cordova error)
            var scenario: number = 10;

            runFailureScenario(scenario).then(done, done);
        });

        it("Failure scenario 11 [(NO path)]", function (done: MochaDone): void {
            // Create command should fail gracefully when the user doesn't provide a path to 'taco create'
            var scenario: number = 11;

            runFailureScenario<TacoErrorCodes>(scenario, TacoErrorCodes.CommandCreateNoPath).then(done, done);
        });

        it("Failure scenario 12 [path (invalid)]", function (done: MochaDone): void {
            // Create command should fail gracefully when the user provides an invalid path to 'taco create'
            var scenario: number = 12;

            runFailureScenario<TacoErrorCodes>(scenario, TacoErrorCodes.CommandCreateInvalidPath).then(done, done);
        });

        it("Failure scenario 13 [path (existing)]", function (done: MochaDone): void {
            // Create command should fail gracefully when the user provides an existing, non-empty path to 'taco create'
            var scenario: number = 13;
            var projectPath: string = getProjectPath(failurePrefix, scenario);

            wrench.mkdirSyncRecursive(path.join(projectPath, "some", "nested", "folders"), 511); // 511 decimal is 0777 octal
            runFailureScenario<TacoErrorCodes>(scenario, TacoErrorCodes.CommandCreatePathNotEmpty).then(done, done);
        });
    });

    describe("Onboarding experience", function (): void {
        var stdoutWrite = process.stdout.write; // We save the original implementation, so we can restore it later
        var memoryStdout: ms.MemoryStream;

        this.timeout(60000); // Instaling the node packages during create can take a long time

        beforeEach(function (done: MochaDone): void {
            memoryStdout = new ms.MemoryStream; // Each individual test gets a new and empty console
            process.stdout.write = memoryStdout.writeAsFunction(); // We'll be printing into an "in-memory" console, so we can test the output
            done();
        });

        after(function (done: MochaDone): void {
            // We just need to reset the stdout just once, after all the tests have finished
            process.stdout.write = stdoutWrite;
            done();
        });

        var teenSpaces = "          ";
        function testCreateForArguments(createCommandLineArguments: string[],
            expectedMessages: string[],
            alternativeExpectedMessages: string[],
            done: MochaDone): void {
            // Some messages are only printted the first time something is executed. When we run all the tests
            // all those messages don't get printted, but if we only run the onboarding tests, they are the first
            // tests to run, so they do get printed. We accept both options and we validate we got one of them
            var commandData: tacoUtils.Commands.ICommandData = {
                options: {},
                original: createCommandLineArguments,
                remain: createCommandLineArguments.slice()
            };
            var create = new Create();
            create.run(commandData).done(() => {
                var expected = expectedMessages.join("\n");

                var actual = LogFormatHelper.strip(memoryStdout.contentsAsText()); // We don't want to compare the colors
                actual = actual.replace(/ {10,}/g, teenSpaces); // We don't want to count spaces when we have a lot of them, so we replace it with 10
                actual = actual.replace(/ +$/gm, ""); // We also don't want trailing spaces
                if (expected !== actual) {
                    var expected = alternativeExpectedMessages.join("\n");
                }

                actual.should.be.equal(expected);
                done();
            }, (arg: any) => {
                done(arg);
            });
        }

        var downloadingDependenciesOutput = ["",
            "PackageLoaderDownloadingMessage",
            "",
            "PackageLoaderDownloadCompletedMessage"];

        it("prints the onboarding experience when using a kit", function (done: MochaDone): void {
            var projectPath = getProjectPath("onboarding-experience", 1);

            var firstPart = ["",
                "CommandCreateStatusCreatingNewProject",
                "      CommandCreateStatusTableSectionSeparator",
                "      CommandCreateStatusTableNameDescription ......... HelloTaco",
                "      CommandCreateStatusTableIDDescription ........... io.cordova.hellocordova",
                "      CommandCreateStatusTableLocationDescription ....." + continueInNextLine + projectPath,
                "      CommandCreateStatusTableKitVersionDescription ... 4.3.1-Kit",
                "      CommandCreateStatusTableReleaseNotesDescription . CommandCreateStatusTableReleaseNotesLink",
                "      CommandCreateStatusTableSectionSeparator",
                "CommandCreateWarningDeprecatedKit"];

            var lastPart = [
                "CommandCreateSuccessProjectTemplate",
                "OnboardingExperienceSectionSeparator",
                "HowToUseChangeToProjectFolder",
                "HowToUseCommandPlatformAddPlatform",
                "HowToUseCommandInstallReqsPlugin",
                "HowToUseCommandAddPlugin",
                "HowToUseCommandSetupRemote",
                "HowToUseCommandBuildPlatform",
                "HowToUseCommandEmulatePlatform",
                "HowToUseCommandRunPlatform",
                "",
                "HowToUseCommandHelp",
                "HowToUseCommandDocs",
                ""];
            testCreateForArguments([projectPath, "--kit", "4.3.1-Kit"],
                firstPart.concat(lastPart),
                firstPart.concat(downloadingDependenciesOutput, lastPart),
                done);
        });

        var continueInNextLine = "\n" + teenSpaces;

        it("prints the onboarding experience when not using a kit", function (done: MochaDone): void {
            var projectPath = getProjectPath("onboarding-experience", 2);

            var firstPart = ["",
                "CommandCreateStatusCreatingNewProject",
                "      CommandCreateStatusTableSectionSeparator",
                "      CommandCreateStatusTableNameDescription .............. HelloTaco",
                "      CommandCreateStatusTableIDDescription ................ io.cordova.hellocordova",
                "      CommandCreateStatusTableLocationDescription .........." + continueInNextLine + projectPath,
                "      CommandCreateStatusTableCordovaCLIVersionDescription . 5.0.0",
                "      CommandCreateStatusTableReleaseNotesDescription ...... CommandCreateStatusTableReleaseNotesLink",
                "      CommandCreateStatusTableSectionSeparator"];

            var lastPart = [
                "CommandCreateSuccessProjectCLI",
                "OnboardingExperienceSectionSeparator",
                "HowToUseChangeToProjectFolder",
                "HowToUseCommandPlatformAddPlatform",
                "HowToUseCommandInstallReqsPlugin",
                "HowToUseCommandAddPlugin",
                "HowToUseCommandSetupRemote",
                "HowToUseCommandBuildPlatform",
                "HowToUseCommandEmulatePlatform",
                "HowToUseCommandRunPlatform",
                "",
                "HowToUseCommandHelp",
                "HowToUseCommandDocs",
                ""];

            testCreateForArguments([projectPath, "--cli", "5.0.0"],
                firstPart.concat(lastPart),
                firstPart.concat(downloadingDependenciesOutput, lastPart),
                done);
        });
    });
});
