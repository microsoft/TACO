// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/// <reference path="../../typings/should.d.ts"/>
/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/rimraf.d.ts"/>
/// <reference path="../../typings/wrench.d.ts"/>
/// <reference path="../../typings/tacoUtils.d.ts"/>
/// <reference path="../../typings/tacoKits.d.ts"/>
/// <reference path="../../typings/tacoTestsUtils.d.ts"/>

"use strict";

/* tslint:disable:no-var-requires */
// var require needed for should module to work correctly
// Note not import: We don't want to refer to shouldModule, but we need the require to occur since it modifies the prototype of Object.
var shouldModule: any = require("should");
/* tslint:enable:no-var-requires */

/* tslint:disable:no-var-requires */
// Special case to allow using color package with index signature for style rules
var colors: any = require("colors/safe");
/* tslint:enable:no-var-requires */

import fs = require ("fs");
import mocha = require ("mocha");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import rimraf = require ("rimraf");
import util = require ("util");
import wrench = require ("wrench");

import kitHelper = require ("../cli/utils/kitHelper");
import resources = require ("../resources/resourceManager");
import TacoErrorCodes = require ("../cli/tacoErrorCodes");
import tacoUtils = require ("taco-utils");
import tacoTestUtils = require ("taco-tests-utils");

import TemplateManager = require ("../cli/utils/templateManager");
import tacoTestsUtils = require ("taco-tests-utils");

import IKeyValuePair = tacoTestUtils.IKeyValuePair;
import tacoPackageLoader = tacoUtils.TacoPackageLoader;
import TacoUtilsErrorCodes = tacoUtils.TacoErrorCode;
import utils = tacoUtils.UtilHelper;
import MemoryStream = tacoTestsUtils.MemoryStream;

import CommandHelper = require ("./utils/commandHelper");
import ICommand = tacoUtils.Commands.ICommand;

interface IScenarioList {
    [scenario: number]: string;
}

describe("taco create", function (): void {
    var tacoFileCount: number = 1;
    var cordovaDefaultProjectFileCount: number = 13; // 6 files and 7 folders

    // The following numbers are for: "plugins", "hooks", "platforms" and ".cordova" folders, and "hooks\readme.md" and ".cordova\cordova.config" files. If our templates ever start to include
    // these files, then to avoid double counting them, we must reduce the counts in this dictionary.
    var cordovaFileCounts: { [kitId: string]: number } = {
        "4.3.0-Kit": 6, // 2 file and 4 folders
        "4.3.1-Kit": 4, // 1 file and 3 folders (no ".cordova\" and ".cordova\cordova.config") 
        "5.1.1-Kit": 4 // 1 file and 3 folders 
    };

    var expectedKitTacoJsonKeyValues: { [kitId: string]: IKeyValuePair<string> } = {
        "4.3.1-Kit" : { kit: "4.3.1-Kit", "cordova-cli": "4.3.1" },
        "5.1.1-Kit" : { kit: "5.1.1-Kit", "cordova-cli": "5.1.1" }
    };

    var expectedCliTacoJsonKeyValues: { [kitId: string]: IKeyValuePair<string> } = {
        "4.3.0" : { "cordova-cli": "4.3.0" },
        "4.3.1" : { "cordova-cli": "4.3.1" },
        "5.1.1" : { "cordova-cli": "5.1.1" }
    };

    // Shared test variables
    var templateManager: TemplateManager;
    var tacoKitsErrors: typeof TacoKits.TacoErrorCode;

    // Project info
    var testAppId: string = "testId";
    var testAppName: string = "testAppName";
    var testTemplateId: string = "testTemplate";
    var testKitId: string = "testKit";

    // Important paths
    var runFolder: string = path.resolve(os.tmpdir(), "taco_cli_create_test_run");
    var tacoHome: string = path.join(runFolder, "taco_home");
    var copyFromPath: string = path.resolve(__dirname, "resources", "templates", "testKit", "testTemplate");
    var testTemplateKitSrc: string = path.resolve(__dirname, "resources", "templates", testKitId);
    var testTemplateSrc: string = path.join(testTemplateKitSrc, testTemplateId);

    // Commands for the different end to end scenarios to test
    var successPrefix: string = "success";
    var failurePrefix: string = "failure";
    var successScenarios: IScenarioList = {
        1: util.format("%s --kit 4.3.1-Kit --template typescript %s %s {}", getProjectPath(successPrefix, 1), testAppId, testAppName),
        2: util.format("%s --kit 5.1.1-Kit --template blank %s %s", getProjectPath(successPrefix, 2), testAppId, testAppName),
        3: util.format("%s --kit 4.3.1-Kit --template typescript %s", getProjectPath(successPrefix, 3), testAppId),
        4: util.format("%s --kit 4.3.1-Kit --template blank", getProjectPath(successPrefix, 4)),
        5: util.format("%s --kit 5.1.1-Kit --template", getProjectPath(successPrefix, 5)),
        6: util.format("%s --kit 4.3.1-Kit", getProjectPath(successPrefix, 6)),
        7: util.format("%s --template blank", getProjectPath(successPrefix, 7)),
        8: util.format("%s --template", getProjectPath(successPrefix, 8)),
        9: util.format("%s --copy-from %s", getProjectPath(successPrefix, 9), copyFromPath),
        10: util.format("%s --cordova 4.3.0", getProjectPath(successPrefix, 10)),
        11: util.format("%s --unknownParameter", getProjectPath(successPrefix, 11)),
        12: util.format("%s --kit", getProjectPath(successPrefix, 12)),
        13: util.format("%s --template typescript", getProjectPath(successPrefix, 13))
    };
    var failureScenarios: IScenarioList = {
        1: util.format("%s --kit unknown", getProjectPath(failurePrefix, 1)),
        2: util.format("%s --template unknown", getProjectPath(failurePrefix, 2)),
        3: util.format("%s --kit 5.1.1-Kit --template typescript --copy-from %s", getProjectPath(failurePrefix, 3), copyFromPath),
        4: util.format("%s --kit 5.1.1-Kit --cordova 4.2.0", getProjectPath(failurePrefix, 4)),
        5: util.format("%s --cordova 4.3.0 --template typescript", getProjectPath(failurePrefix, 5)),
        6: util.format("%s --kit 4.3.1-Kit --template typescript %s %s {}", getProjectPath(failurePrefix, 6), testAppId, testAppName),
        7: util.format("%s --kit 5.1.1-Kit --copy-from unknownCopyFromPath", getProjectPath(failurePrefix, 7)),
        8: util.format("%s --cordova unknownCliVersion", getProjectPath(failurePrefix, 8)),
        9: util.format("%s 42", getProjectPath(failurePrefix, 9)),
        10: "",
        11: util.format("%s/invalid/project/path", getProjectPath(failurePrefix, 11)),
        12: util.format("%s", getProjectPath(failurePrefix, 12))
    };

    function getProjectPath(suitePrefix: string, scenario: number): string {
        return path.join(runFolder, suitePrefix + scenario);
    }

    function createProject(scenario: number, scenarioList: IScenarioList): Q.Promise<any> {
        var create: ICommand = CommandHelper.getCommand("create");
        return create.run(scenarioList[scenario].split(" "));
    }

    function countProjectItemsRecursive(projectPath: string): number {
        if (!fs.existsSync(projectPath)) {
            return 0;
        }

        var files: string[] = wrench.readdirSyncRecursive(projectPath);

        return files.length;
    }

    function verifyTacoJsonKeyValues(projectPath: string, keyValues: IKeyValuePair<string>): void {
        var tacoJsonPath: string = path.resolve(projectPath, "taco.json");

        if (!fs.existsSync(tacoJsonPath)) {
            throw new Error("Taco.json file not found");
        }

        var tacoJson: IKeyValuePair<string> = require(tacoJsonPath);

        tacoJson.should.be.eql(tacoJson);
    }

    function runScenarioWithExpectedFileCount(scenario: number, expectedFileCount: number, tacoJsonFileContents?: IKeyValuePair<string>): Q.Promise<any> {
        return createProject(scenario, successScenarios)
            .then(function (): void {
                var projectPath: string = getProjectPath(successPrefix, scenario);
                var fileCount: number = countProjectItemsRecursive(projectPath);

                fileCount.should.be.exactly(expectedFileCount);

                if (tacoJsonFileContents) {
                    verifyTacoJsonKeyValues(projectPath, tacoJsonFileContents);
                }
            });
    }

    function runScenario(scenario: number, kitUsed: string, templateUsed: string, tacoJsonFileContents?: IKeyValuePair<string>): Q.Promise<any> {
        return templateManager.getTemplateEntriesCount(kitUsed, templateUsed)
            .then(function (templateEntries: number): Q.Promise<any> {
                var totalEntries: number = templateEntries + tacoFileCount + cordovaFileCounts[kitUsed];

                return runScenarioWithExpectedFileCount(scenario, totalEntries, tacoJsonFileContents);
            });
    }

    function runFailureScenario<T>(scenario: number, expectedErrorCode?: T): Q.Promise<any> {
        return createProject(scenario, failureScenarios)
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
        // Set ResourcesManager to test mode
        process.env["TACO_UNIT_TEST"] = true;

        // Set a temporary location for taco_home
        process.env["TACO_HOME"] = tacoHome;

        // Force KitHelper to fetch the package fresh
        kitHelper.kitPackagePromise = null;

        // Instantiate the persistent templateManager
        templateManager = new TemplateManager(kitHelper);

        // Delete existing run folder if necessary
        rimraf.sync(runFolder);

        // Create the run folder for our tests
        wrench.mkdirSyncRecursive(runFolder, 511); // 511 decimal is 0777 octal

        // Load taco-kits error codes
        tacoPackageLoader.lazyRequire("taco-kits", "taco-kits").then((tacoKits: typeof TacoKits) => {
            tacoKitsErrors = tacoKits.TacoErrorCode;
            done();
        });
    });

    after(function (done: MochaDone): void {
        kitHelper.kitPackagePromise = null;
        rimraf(runFolder, done);
    });

    describe("Success scenarios", function (): void { // Downloading packages from the internet can take a while.
        it("Success scenario 1 [path, id, name, cordovaConfig, kit, template]", function (done: MochaDone): void {
            var scenario: number = 1;

            // Should use kit 4.3.1-Kit and template typescript
            runScenario(scenario, "4.3.1-Kit", "typescript", expectedKitTacoJsonKeyValues["4.3.1-Kit"]).done(() => done(), done);
        });

        it("Success scenario 2 [path, id, name, kit, template]", function (done: MochaDone): void {
            var scenario: number = 2;

            // Should use kit 5.1.1-Kit and template blank
            runScenario(scenario, "5.1.1-Kit", "blank", expectedKitTacoJsonKeyValues["5.1.1-Kit"]).done(() => done(), done);
        });

        it("Success scenario 3 [path, id, kit, template]", function (done: MochaDone): void {
            var scenario: number = 3;

            // Should use kit 4.3.1-Kit and template typescript
            runScenario(scenario, "4.3.1-Kit", "typescript", expectedKitTacoJsonKeyValues["4.3.1-Kit"]).done(() => done(), done);
        });

        it("Success scenario 4 [path, kit, template]", function (done: MochaDone): void {
            var scenario: number = 4;

            // Should use kit 4.3.1-Kit and template blank
            runScenario(scenario, "4.3.1-Kit", "blank", expectedKitTacoJsonKeyValues["4.3.1-Kit"]).done(() => done(), done);
        });

        it("Success scenario 5 [path, kit, template (no value)]", function (done: MochaDone): void {
            var scenario: number = 5;

            // Should use kit 5.1.1-Kit and template blank
            runScenario(scenario, "5.1.1-Kit", "blank", expectedKitTacoJsonKeyValues["5.1.1-Kit"]).done(() => done(), done);
        });

        it("Success scenario 6 [path, kit]", function (done: MochaDone): void {
            var scenario: number = 6;

            // Should use kit 4.3.1-Kit and template blank
            runScenario(scenario, "4.3.1-Kit", "blank", expectedKitTacoJsonKeyValues["4.3.1-Kit"]).done(() => done(), done);
        });

        it("Success scenario 7 [path, template]", function (done: MochaDone): void {
            var scenario: number = 7;

            // Should use kit 5.1.1-Kit and template blank
            runScenario(scenario, "5.1.1-Kit", "blank", expectedKitTacoJsonKeyValues["5.1.1-Kit"]).done(() => done(), done);
        });

        it("Success scenario 8 [path, template (no value)]", function (done: MochaDone): void {
            var scenario: number = 8;

            // Should use kit 5.1.1-Kit and template blank
            runScenario(scenario, "5.1.1-Kit", "blank", expectedKitTacoJsonKeyValues["5.1.1-Kit"]).done(() => done(), done);
        });

        it("Success scenario 9 [path, copy-from]", function (done: MochaDone): void {
            var scenario: number = 9;

            // copy-from custom assets: 2 files and 1 folder
            // Kit 5.1.1-Kit: Cordova adds 2 files and 4 folders
            var totalEntries: number = 9 + tacoFileCount;

            runScenarioWithExpectedFileCount(scenario, totalEntries, expectedKitTacoJsonKeyValues["5.1.1-Kit"]).done(() => done(), done);
        });

        it("Success scenario 10 [path, cli]", function (done: MochaDone): void {
            var scenario: number = 10;

            // CLI 4.2.0 + default Cordova project
            // TACO: adds 1 file
            var totalEntries: number = cordovaDefaultProjectFileCount + tacoFileCount;

            runScenarioWithExpectedFileCount(scenario, totalEntries, expectedCliTacoJsonKeyValues["4.3.0"]).done(() => done(), done);
        });

        it("Success scenario 11 [path, extra unknown parameter]", function (done: MochaDone): void {
            var scenario: number = 11;

            // Should use kit 5.1.1-Kit and template blank
            runScenario(scenario, "5.1.1-Kit", "blank", expectedKitTacoJsonKeyValues["5.1.1-Kit"]).done(() => done(), done);
        });

        it("Success scenario 12 [path, kit (empty)]", function (done: MochaDone): void {
            var scenario: number = 12;

            // Should use kit 5.1.1-Kit and template blank
            runScenario(scenario, "5.1.1-Kit", "blank", expectedKitTacoJsonKeyValues["5.1.1-Kit"]).done(() => done(), done);
        });

        it("Success scenario 13 [path, template (typescript)]", function (done: MochaDone): void {
            var scenario: number = 13;

            // Should use kit 5.1.1-Kit and template typescript
            runScenario(scenario, "5.1.1-Kit", "typescript", expectedKitTacoJsonKeyValues["5.1.1-Kit"]).done(() => done(), done);
        });
    });

    describe("Failure scenarios", function (): void {
        it("Failure scenario 1 [path, kit (unknown value)]", function (done: MochaDone): void {
            // Create command should fail if --kit was specified with an unknown value
            var scenario: number = 1;

            runFailureScenario<TacoKits.TacoErrorCode>(scenario, tacoKitsErrors.TacoKitsExceptionInvalidKit).done(() => done(), done);
        });

        it("Failure scenario 2 [path, template (unknown value)]", function (done: MochaDone): void {
            // If a template is not found, create command should fail with an appropriate message
            var scenario: number = 2;

            runFailureScenario<TacoKits.TacoErrorCode>(scenario, tacoKitsErrors.TacoKitsExceptionInvalidTemplate).done(() => done(), done);
        });

        it("Failure scenario 3 [path, kit, template, copy-from]", function (done: MochaDone): void {
            // Create command should fail when both --template and --copy-from are specified
            var scenario: number = 3;

            runFailureScenario<TacoErrorCodes>(scenario, TacoErrorCodes.CommandCreateNotTemplateIfCustomWww).done(() => done(), done);
        });

        it("Failure scenario 4 [path, kit, cli]", function (done: MochaDone): void {
            // Create command should fail when both --kit and --cordova are specified
            var scenario: number = 4;

            runFailureScenario<TacoErrorCodes>(scenario, TacoErrorCodes.CommandCreateNotBothCordovaCliAndKit).done(() => done(), done);
        });

        it("Failure scenario 5 [path, cli, template]", function (done: MochaDone): void {
            // Create command should fail when both --cordova and --template are specified
            var scenario: number = 5;

            runFailureScenario<TacoErrorCodes>(scenario, TacoErrorCodes.CommandCreateNotBothTemplateAndCordovaCli).done(() => done(), done);
        });

        it("Failure scenario 6 [path (value is an existing project)]", function (done: MochaDone): void {
            // Create command should fail when the specified path is a non-empty existing folder (Cordova error)
            var scenario: number = 6;
            var copyDest: string = getProjectPath(failurePrefix, scenario);

            wrench.mkdirSyncRecursive(copyDest, 511); // 511 decimal is 0777 octal
            utils.copyRecursive(testTemplateSrc, copyDest)
                .then(function (): Q.Promise<any> {
                    return runFailureScenario(scenario);
                })
                .done(() => done(), done);
        });

        it("Failure scenario 7 [path, copy-from (unknown path)]", function (done: MochaDone): void {
            // Create command should fail when --copy-from is specified with a path that doesn't exist (Cordova error)
            var scenario: number = 7;

            runFailureScenario(scenario).done(() => done(), done);
        });

        it("Failure scenario 8 [path, cli (unknown value)]", function (done: MochaDone): void {
            // Create command should fail when specified cli version doesn't exist
            var scenario: number = 8;

            runFailureScenario<TacoUtilsErrorCodes>(scenario, TacoUtilsErrorCodes.PackageLoaderInvalidPackageVersionSpecifier).done(() => done(), done);
        });

        it("Failure scenario 9[path, appId (invalid value)]", function (done: MochaDone): void {
            // Create command should fail when an invalid app ID is specified (Cordova error)
            var scenario: number = 9;

            runFailureScenario(scenario).done(() => done(), done);
        });

        it("Failure scenario 10 [(NO path)]", function (done: MochaDone): void {
            // Create command should fail gracefully when the user doesn't provide a path to 'taco create'
            var scenario: number = 10;

            runFailureScenario<TacoErrorCodes>(scenario, TacoErrorCodes.CommandCreateNoPath).done(() => done(), done);
        });

        it("Failure scenario 11 [path (invalid)]", function (done: MochaDone): void {
            // Create command should fail gracefully when the user provides an invalid path to 'taco create'
            var scenario: number = 11;

            runFailureScenario<TacoErrorCodes>(scenario, TacoErrorCodes.CommandCreateInvalidPath).done(() => done(), done);
        });

        it("Failure scenario 12 [path (existing)]", function (done: MochaDone): void {
            // Create command should fail gracefully when the user provides an existing, non-empty path to 'taco create'
            var scenario: number = 12;
            var projectPath: string = getProjectPath(failurePrefix, scenario);

            wrench.mkdirSyncRecursive(path.join(projectPath, "some", "nested", "folders"), 511); // 511 decimal is 0777 octal
            runFailureScenario<TacoErrorCodes>(scenario, TacoErrorCodes.CommandCreatePathNotEmpty).done(() => done(), done);
        });
    });

    describe("Onboarding experience", () => {
        // because of function overloading assigning "(buffer: string, cb?: Function) => boolean" as the type for
        // stdoutWrite just doesn't work
        var stdoutWrite = process.stdout.write; // We save the original implementation, so we can restore it later
        var memoryStdout: MemoryStream;

        beforeEach(() => {
            memoryStdout = new MemoryStream; // Each individual test gets a new and empty console
            process.stdout.write = memoryStdout.writeAsFunction(); // We'll be printing into an "in-memory" console, so we can test the output
        });

        after(() => {
            // We just need to reset the stdout just once, after all the tests have finished
            process.stdout.write = stdoutWrite;
        });

        var tenSpaces: string  = "          ";
        var tenMinuses: string = "----------";
        function testCreateForArguments(createCommandLineArguments: string[],
            expectedMessages: string[],
            alternativeExpectedMessages: string[],
            done: MochaDone): void {
            // Some messages are only printed the first time something is executed. When we run all the tests
            // all those messages don't get printed, but if we only run the onboarding tests, they are the first
            // tests to run, so they do get printed. We accept both options and we validate we got one of them
            var create: ICommand = CommandHelper.getCommand("create");
            create.run(createCommandLineArguments).done(() => {
                var expected : string = expectedMessages.join("\n");

                var actual: string = colors.strip(memoryStdout.contentsAsText()); // We don't want to compare the colors
                actual = actual.replace(/ {10,}/g, tenSpaces); // We don't want to count spaces when we have a lot of them, so we replace it with 10
                actual = actual.replace(/-{10,}/g, tenMinuses); // We don't want to count -----s when we have a lot of them, so we replace it with 10 (They also depend dynamically on the path length)
                actual = actual.replace(/ +$/gm, ""); // We also don't want trailing spaces
                actual = actual.replace(/ \.+ ?\n  +/gm, " ..... "); // We undo the word-wrapping
                actual = actual.replace(/ *\n +\(/gm, " ("); // We undo the word-wrapping
                actual = actual.replace(/\n\n /gm, "\n "); // We undo the word-wrapping
                actual = actual.replace(/ \.+ /gm, " ..... "); // We want all the points to always be 5 points .....

                if (expectedMessages.every((msg: string) => actual.indexOf(msg) >= 0) || alternativeExpectedMessages.every((msg: string) => actual.indexOf(msg) >= 0)) {
                    done();
                } else {
                    done(new Error("Bad onboarding for " + createCommandLineArguments));
                }
            }, (arg: any) => {
                done(arg);
            });
        }

        var downloadingDependenciesOutput: string[] = ["",
            "PackageLoaderDownloadingMessage",
            "",
            "PackageLoaderDownloadCompletedMessage"];

        it("prints the onboarding experience when using a kit", function (done: MochaDone): void {

            var projectPath: string = getProjectPath("onboarding-experience", 1);

            var firstPart: string[] = [
                "      ----------",
                "      CommandCreateStatusTableNameDescription ..... HelloTaco",
                "      CommandCreateStatusTableIDDescription ..... io.taco.hellotaco",
                "      CommandCreateStatusTableLocationDescription ..... " + projectPath,
                "      CommandCreateStatusTableKitVersionDescription ..... 4.3.1-Kit",
                "      ----------"];

            var lastPart: string[] = [
                "CommandCreateSuccessProjectTemplate",
                "OnboardingExperienceTitle",
                " * HowToUseChangeToProjectFolder",
                " * HowToUseCommandPlatformAddPlatform",
                " * HowToUseCommandInstallReqsPlugin",
                " * HowToUseCommandAddPlugin",
                " * HowToUseCommandSetupRemote",
                " * HowToUseCommandBuildPlatform",
                " * HowToUseCommandEmulatePlatform",
                " * HowToUseCommandRunPlatform",
                "",
                "HowToUseCommandHelp",
                "HowToUseCommandDocs",
                ""];
            testCreateForArguments([projectPath, "--kit", "4.3.1-Kit"],
                firstPart.concat(lastPart),
                firstPart.concat(downloadingDependenciesOutput, lastPart),
                done);
        });

        it("prints the onboarding experience when not using a kit", function (done: MochaDone): void {
            var projectPath: string = getProjectPath("onboarding-experience", 2);

            var firstPart: string[] = [
                "      ----------",
                "      CommandCreateStatusTableNameDescription ..... HelloTaco",
                "      CommandCreateStatusTableIDDescription ..... io.taco.hellotaco",
                "      CommandCreateStatusTableLocationDescription ..... " + projectPath,
                "      CommandCreateStatusTableCordovaCLIVersionDescription ..... 5.1.1",
                "      ----------"];

            var lastPart: string[] = [
                "CommandCreateSuccessProjectCLI",
                "OnboardingExperienceTitle",
                " * HowToUseChangeToProjectFolder",
                " * HowToUseCommandPlatformAddPlatform",
                " * HowToUseCommandInstallReqsPlugin",
                " * HowToUseCommandAddPlugin",
                " * HowToUseCommandSetupRemote",
                " * HowToUseCommandBuildPlatform",
                " * HowToUseCommandEmulatePlatform",
                " * HowToUseCommandRunPlatform",
                "",
                "HowToUseCommandHelp",
                "HowToUseCommandDocs",
                ""];

            testCreateForArguments([projectPath, "--cordova", "5.1.1"],
                firstPart.concat(lastPart),
                firstPart.concat(downloadingDependenciesOutput, lastPart),
                done);
        });

        it("it adds (Deprecated) to a deprecated kit", function (done: MochaDone): void {
            var projectPath: string = getProjectPath("onboarding-experience", 3);

            var firstPart: string[] = [
                "      ----------",
                "      CommandCreateStatusTableNameDescription ..... HelloTaco",
                "      CommandCreateStatusTableIDDescription ..... io.taco.hellotaco",
                "      CommandCreateStatusTableLocationDescription ..... " + projectPath,
                "      CommandCreateStatusTableKitVersionDescription ..... 4.3.0-Kit (CommandKitListDeprecatedKit)",
                "      ----------"];

            var lastPart: string[] = [
                "CommandCreateWarningDeprecatedKit",
                "CommandCreateSuccessProjectTemplate",
                "OnboardingExperienceTitle",
                " * HowToUseChangeToProjectFolder",
                " * HowToUseCommandPlatformAddPlatform",
                " * HowToUseCommandInstallReqsPlugin",
                " * HowToUseCommandAddPlugin",
                " * HowToUseCommandSetupRemote",
                " * HowToUseCommandBuildPlatform",
                " * HowToUseCommandEmulatePlatform",
                " * HowToUseCommandRunPlatform",
                "",
                "HowToUseCommandHelp",
                "HowToUseCommandDocs",
                ""];
            testCreateForArguments([projectPath, "--kit", "4.3.0-Kit"],
                firstPart.concat(lastPart),
                firstPart.concat(downloadingDependenciesOutput, lastPart),
                done);
        });

        it("it adds (Default) to a default kit", function (done: MochaDone): void {
            var projectPath: string = getProjectPath("onboarding-experience", 4);
            kitHelper.getDefaultKit().done((defaultKitId: string) => {
                var firstPart: string[] = [
                    "      ----------",
                    "      CommandCreateStatusTableNameDescription ..... HelloTaco",
                    "      CommandCreateStatusTableIDDescription ..... io.taco.hellotaco",
                    "      CommandCreateStatusTableLocationDescription ..... " + projectPath,
                    "      CommandCreateStatusTableKitVersionDescription ..... " + defaultKitId + " (CommandKitListDefaultKit)",
                    "      ----------"];

                var lastPart: string[] = [
                    "CommandCreateSuccessProjectTemplate",
                    "OnboardingExperienceTitle",
                    " * HowToUseChangeToProjectFolder",
                    " * HowToUseCommandPlatformAddPlatform",
                    " * HowToUseCommandInstallReqsPlugin",
                    " * HowToUseCommandAddPlugin",
                    " * HowToUseCommandSetupRemote",
                    " * HowToUseCommandBuildPlatform",
                    " * HowToUseCommandEmulatePlatform",
                    " * HowToUseCommandRunPlatform",
                    "",
                    "HowToUseCommandHelp",
                    "HowToUseCommandDocs",
                    ""];
                testCreateForArguments([projectPath, "--kit", defaultKitId],
                    firstPart.concat(lastPart),
                    firstPart.concat(downloadingDependenciesOutput, lastPart),
                    done);
            });
        });
    });

    describe("Telemetry properties", () => {
        var cliVersion: string = require("../package.json").version;

        function createProjectAndVerifyTelemetryProps(args: string[], expectedProperties: TacoUtility.ICommandTelemetryProperties, done: MochaDone): void {
            var create: ICommand = CommandHelper.getCommand("create");

            // Create a dummy test project with no platforms added
            create.run(args).done((telemetryParameters: TacoUtility.ICommandTelemetryProperties) => {
                telemetryParameters.should.be.eql(expectedProperties);
                done();
            }, done);
        }

        it("Returns the expected telemetry properties for a kit project created with the Blank template", function (done: MochaDone): void {
            var projectPath: string = getProjectPath("Telemetry properties for Create command", 1);

            var expected: TacoUtility.ICommandTelemetryProperties = {
                        cliVersion: { isPii: false, value: cliVersion },
                        kit: { isPii: false, value: "5.1.1-Kit" },
                        template: { isPii: false, value: "blank" },
                        "options.kit": { isPii: false, value: "5.1.1-Kit" }
            };
            createProjectAndVerifyTelemetryProps([projectPath, "--kit", "5.1.1-Kit"], expected, done);
        });

        it("Returns the expected telemetry properties for a kit project created with TypeScript template", function (done: MochaDone): void {
            var projectPath: string = getProjectPath("Telemetry properties for Create command", 2);

            var expected: TacoUtility.ICommandTelemetryProperties = {
                        cliVersion: { isPii: false, value: cliVersion },
                        kit: { isPii: false, value: "5.1.1-Kit" },
                        template: { isPii: false, value: "typescript" },
                        "options.kit": { isPii: false, value: "5.1.1-Kit" },
                        "options.template": { isPii: false, value: "typescript" }
            };

            createProjectAndVerifyTelemetryProps([projectPath, "--kit", "5.1.1-Kit", "--template", "typescript"], expected, done);
        });

        it("Returns the expected telemetry properties for a CLI project", function (done: MochaDone): void {
            var projectPath: string = getProjectPath("Telemetry properties for Create command", 3);

            var expected: TacoUtility.ICommandTelemetryProperties = {
                        cliVersion: { isPii: false, value: cliVersion },
                        cordova: { isPii: false, value: "4.3.0" },
                        "options.cordova": { isPii: false, value: "4.3.0" }
            };

            createProjectAndVerifyTelemetryProps([projectPath, "--cordova", "4.3.0"], expected, done);
        });
    });
});
