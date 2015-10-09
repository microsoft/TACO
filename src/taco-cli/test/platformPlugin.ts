/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */
/// <reference path="../../typings/mocha.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/should.d.ts" />
/// <reference path="../../typings/cordovaExtensions.d.ts" />
/// <reference path="../../typings/del.d.ts" />
"use strict";

/* tslint:disable:no-var-requires */
// var require needed for should module to work correctly
// Note not import: We don't want to refer to shouldModule, but we need the require to occur since it modifies the prototype of Object.
var shouldModule: any = require("should");
/* tslint:enable:no-var-requires */

import child_process = require ("child_process");
import del = require ("del");
import fs = require ("fs");
import http = require ("http");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import querystring = require ("querystring");
import rimraf = require("rimraf");
import tacoUtility = require("taco-utils");
import util = require ("util");
import wrench = require ("wrench");

import Platform = require ("../cli/platform");
import Plugin = require ("../cli/plugin");
import Create = require ("../cli/create");
import kitHelper = require ("../cli/utils/kitHelper");
import resources = require ("../resources/resourceManager");
import TacoUtility = require ("taco-utils");
import ms = require("./utils/memoryStream");
import commands = tacoUtility.Commands;

import utils = TacoUtility.UtilHelper;

var platformCommand: Platform = new Platform();
platformCommand.info = <commands.ICommandInfo>{};
platformCommand.info.aliases = {"rm": "remove", "ls": "list"};
var pluginCommand: Plugin = new Plugin();
pluginCommand.info = <commands.ICommandInfo>{};
pluginCommand.info.aliases = { "rm": "remove", "ls": "list" };
var createCommand: Create = new Create();

var testKitId: string = "5.1.1-Kit";

/* tslint:disable:no-var-requires */
// var require needed to require package json
var cliVersion: string = require("../package.json").version;
/* tslint:enable:no-var-requires */

interface IComponentVersionMap {
    [component: string]: string;
}

interface ICommandAndResult {
    command: string;
    expectedVersions: IComponentVersionMap;
    expectedTelemetryProperties: TacoUtility.ICommandTelemetryProperties;
}

// Expected valued for various scenarios
var userOverridePlatformVersions: IComponentVersionMap = {
    android: "4.0.1",
    ios: "3.8.0"
};

var kitPlatformVersions: IComponentVersionMap = {
    android: "4.0.2",
    ios: "3.8.0"
};

var cliPlatformVersions: IComponentVersionMap = {
    android: "4.0.0",
    ios: "3.8.0"
};

var userOverridePluginVersions: IComponentVersionMap = {
    "cordova-plugin-camera": "1.0.0",
    "cordova-plugin-contacts": "1.0.0"
};

var kitPluginVersions: IComponentVersionMap = {
    "cordova-plugin-camera": "1.1.0",
    "cordova-plugin-contacts": "1.0.0"
};

var kitPlatformOperations: ICommandAndResult[] = [
            {
                command: "add android ios",
                expectedVersions: kitPlatformVersions,
                expectedTelemetryProperties: {
                    kit: { isPii: false, value: "5.1.1-Kit" },
                    cliVersion: { isPii: false, value: cliVersion },
                    isTacoProject: { isPii: false, value: "true" },
                    projectType: { isPii: false, value: "JavaScript" },
                    subCommand: { isPii: false, value: "add" },
                    target1: { isPii: false, value: "android@4.0.2" },
                    target2: { isPii: false, value: "ios@3.8.0" }
                }
            },
            {
                command: "rm android ios",
                expectedVersions: {},
                expectedTelemetryProperties: {
                        kit: { isPii: false, value: "5.1.1-Kit" },
                        cliVersion: { isPii: false, value: cliVersion },
                        isTacoProject: { isPii: false, value: "true" },
                        projectType: { isPii: false, value: "JavaScript" },
                        subCommand: { isPii: false, value: "rm" },
                        target1: { isPii: false, value: "android" },
                        target2: { isPii: false, value: "ios" }
                }
            },
            {
                command: "add android@4.0.1 ios@3.8.0",
                expectedVersions: userOverridePlatformVersions,
                expectedTelemetryProperties: {
                        kit: { isPii: false, value: "5.1.1-Kit" },
                        cliVersion: { isPii: false, value: cliVersion },
                        isTacoProject: { isPii: false, value: "true" },
                        projectType: { isPii: false, value: "JavaScript" },
                        subCommand: { isPii: false, value: "add" },
                        target1: { isPii: false, value: "android@4.0.1" },
                        target2: { isPii: false, value: "ios@3.8.0" }
            }
        }
    ];

var cliPlatformOperations: ICommandAndResult[] = [
        {
            command: "add android browser",
            expectedVersions: cliPlatformVersions,
            expectedTelemetryProperties: {
                    cli: { isPii: false, value: "5.0.0" },
                    cliVersion: { isPii: false, value: cliVersion },
                    isTacoProject: { isPii: false, value: "true" },
                    projectType: { isPii: false, value: "JavaScript" },
                    subCommand: { isPii: false, value: "add" },
                    target1: { isPii: false, value: "android" },
                    target2: { isPii: false, value: "browser" }
            }
        },
        {
            command: "remove android browser",
            expectedVersions: {},
            expectedTelemetryProperties: {
                cli: { isPii: false, value: "5.0.0" },
                cliVersion: { isPii: false, value: cliVersion },
                isTacoProject: { isPii: false, value: "true" },
                projectType: { isPii: false, value: "JavaScript" },
                subCommand: { isPii: false, value: "remove" },
                target1: { isPii: false, value: "android" },
                target2: { isPii: false, value: "browser" }
            }
        },

        {
            command: "add android@4.0.1 browser@4.0.0",
            expectedVersions: userOverridePlatformVersions,
            expectedTelemetryProperties: {
                cli: { isPii: false, value: "5.0.0" },
                cliVersion: { isPii: false, value: cliVersion },
                isTacoProject: { isPii: false, value: "true" },
                projectType: { isPii: false, value: "JavaScript" },
                subCommand: { isPii: false, value: "add" },
                target1: { isPii: false, value: "android@4.0.1" },
                target2: { isPii: false, value: "browser@4.0.0" }
            }
        },
        {
            command: "remove android browser",
            expectedVersions: {},
            expectedTelemetryProperties: {
                cli: { isPii: false, value: "5.0.0" },
                cliVersion: { isPii: false, value: cliVersion },
                isTacoProject: { isPii: false, value: "true" },
                projectType: { isPii: false, value: "JavaScript" },
                subCommand: { isPii: false, value: "remove" },
                target1: { isPii: false, value: "android" },
                target2: { isPii: false, value: "browser" }
            }
        }
    ];

var kitPluginOperations: ICommandAndResult[] = [
        {
            command: "add cordova-plugin-camera@1.0.0 cordova-plugin-contacts@1.0.0",
            expectedVersions: userOverridePluginVersions,
            expectedTelemetryProperties: {
                kit: { isPii: false, value: "5.1.1-Kit" },
                cliVersion: { isPii: false, value: cliVersion },
                isTacoProject: { isPii: false, value: "true" },
                projectType: { isPii: false, value: "JavaScript" },
                subCommand: { isPii: false, value: "add" },
                target1: { isPii: false, value: "cordova-plugin-camera@1.0.0" },
                target2: { isPii: false, value: "cordova-plugin-contacts@1.0.0" }
            }
        },
        {
            command: "remove cordova-plugin-camera cordova-plugin-contacts",
            expectedVersions: {},
            expectedTelemetryProperties: {
                kit: { isPii: false, value: "5.1.1-Kit" },
                cliVersion: { isPii: false, value: cliVersion },
                isTacoProject: { isPii: false, value: "true" },
                projectType: { isPii: false, value: "JavaScript" },
                subCommand: { isPii: false, value: "remove" },
                target1: { isPii: false, value: "cordova-plugin-camera" },
                target2: { isPii: false, value: "cordova-plugin-contacts" }
            }
        }
    ];

var cliPluginOperations: ICommandAndResult[] = [
        {
            command: "add cordova-plugin-camera@1.0.0 cordova-plugin-contacts@1.0.0",
            expectedVersions: userOverridePluginVersions,
            expectedTelemetryProperties: {
                cli: { isPii: false, value: "5.0.0" },
                cliVersion: { isPii: false, value: cliVersion },
                isTacoProject: { isPii: false, value: "true" },
                projectType: { isPii: false, value: "JavaScript" },
                subCommand: { isPii: false, value: "add" },
                target1: { isPii: false, value: "cordova-plugin-camera@1.0.0" },
                target2: { isPii: false, value: "cordova-plugin-contacts@1.0.0" }
            }
        },
        {
            command: "rm cordova-plugin-camera cordova-plugin-contacts",
            expectedVersions: {},
            expectedTelemetryProperties: {
                cli: { isPii: false, value: "5.0.0" },
                cliVersion: { isPii: false, value: cliVersion },
                isTacoProject: { isPii: false, value: "true" },
                projectType: { isPii: false, value: "JavaScript" },
                subCommand: { isPii: false, value: "rm" },
                target1: { isPii: false, value: "cordova-plugin-camera" },
                target2: { isPii: false, value: "cordova-plugin-contacts" }
            }
        }
    ];

describe("taco platform for kit", function(): void {
    var tacoHome: string = path.join(os.tmpdir(), "taco-cli", "platformPlugin");
    var cliProjectDir: string = "cliProject";
    var kitProjectDir: string = "kitProject";
    var originalCwd: string;
    var cordovaVersion: string = "5.1.1";

    function createProject(args: string[], projectDir: string): Q.Promise<any> {
        // Create a dummy test project with no platforms added
        utils.createDirectoryIfNecessary(tacoHome);
        process.chdir(tacoHome);
        return Q.denodeify(del)(projectDir).then(function(): Q.Promise<any> {
            return createCommand.run({
                options: {},
                original: args,
                remain: args
            });
        }).then(function(): void {
            var projectPath: string = path.join(tacoHome, projectDir);
            process.chdir(projectPath);
        });
    }

    function createCliProject(cli: string): Q.Promise<any> {
        return createProject(["cliProject", "--cordova", cli], cliProjectDir);
    }

    function createKitProject(kit: string): Q.Promise<any> {
        // Create a dummy test project with no platforms added
        return createProject(["kitProject", "--kit", kit], kitProjectDir);
    }

    function platformRun(args: string[]): Q.Promise<any> {
        return platformCommand.run({
            options: {},
            original: args,
            remain: args
        });
    }

    function pluginRun(args: string[]): Q.Promise<any> {
        return pluginCommand.run({
            options: {},
            original: args,
            remain: args
        });
    }

    function getInstalledPlatforms(platformsExpected: IComponentVersionMap, projectPath: string): string[] {
        var platformsDir: string = path.join(projectPath, "platforms");
        if (!fs.existsSync(platformsDir)) {
            return [];
        }

        return fs.readdirSync(platformsDir).filter(function(platform: string): boolean {
            return Object.keys(platformsExpected).indexOf(platform) > -1;
        });
    }

    function checkPlatformVersions(platformsExpected: IComponentVersionMap, projectPath: string): Q.Promise<any> {
        var platformsInstalled: string[] = getInstalledPlatforms(platformsExpected, projectPath);
        var onWindows: boolean = process.platform === "win32";
        var deferred: Q.Deferred<any> = Q.defer<any>();
        return Q.all(platformsInstalled.map(function(platform: string): Q.Promise<any> {
            var cmdName: string = "version";
            if (onWindows) {
                cmdName = cmdName + ".bat";
            }

            var cmdPath: string = path.join(projectPath, "platforms", platform, "cordova", cmdName);
            var versionProc: child_process.ChildProcess = child_process.spawn(cmdPath);
            versionProc.stdout.on("data", function(data: any): void {
                var version: string = data.toString();
                if (!path) {
                    deferred.reject("Verson string not found");
                } else {
                    version.trim().should.be.equal(platformsExpected[platform]);
                    deferred.resolve({});
                }
            });
            versionProc.on("close", function(code: number): void {
                deferred.reject("Unable to find version string");
            });
            versionProc.on("error", function(err: any): void {
                deferred.reject(err);
            });
            return deferred.promise;
        }));
    }

    function getInstalledPluginVersion(plugin: string, projectPath: string): string {
        var pluginPackgeJson: string = path.join(projectPath, "plugins", plugin, "package.json");
        var pluginInfo: any = require(pluginPackgeJson);
        if (pluginInfo) {
            return pluginInfo["version"];
        }

        return "";
    }

    function checkPluginVersions(pluginsExpected: IComponentVersionMap, projectPath: string): void {
        var deferred: Q.Deferred<any> = Q.defer<any>();
        Object.keys(pluginsExpected).forEach(function(plugin: string): void {
            var versionInstalled: string = getInstalledPluginVersion(plugin, projectPath);
            versionInstalled.trim().should.be.equal(pluginsExpected[plugin]);
        });
    }

    function sleep(milliseconds: number): Q.Promise<any> {
        var deferred: Q.Deferred<any> = Q.defer();
        setTimeout(deferred.resolve, milliseconds);
        return deferred.promise;
    };

    before(function(mocha: MochaDone): void {
        originalCwd = process.cwd();
        process.env["TACO_UNIT_TEST"] = true;
        // Use a dummy home location so we don't trash any real configurations
        process.env["TACO_HOME"] = tacoHome;

        // Force KitHelper to fetch the package fresh
        kitHelper.kitPackagePromise = null;

        this.timeout(100000);
        rimraf.sync(tacoHome);
        createKitProject("5.1.1-Kit")
            .done(function(): void {
                mocha();
            });
    });

    after(function(done: MochaDone): void {
        this.timeout(30000);
        process.chdir(originalCwd);
        kitHelper.kitPackagePromise = null;
        rimraf(tacoHome, function(err: Error): void { done(); }); // ignore errors
    });

    describe("taco platform/plugin operation for a kit project with platform/plugin overrides execute with no errors", function(): void {
        var kitProjectpath: string;
        this.timeout(50000);

        before(function(): void {
            kitProjectpath = path.join(tacoHome, kitProjectDir);
            process.chdir(kitProjectpath);
        });

        after(function(done: MochaDone): void {
            this.timeout(30000);
            process.chdir(tacoHome);
            rimraf(kitProjectpath, function(err: Error): void { done(); }); // ignore errors
        });

        kitPlatformOperations.forEach(function(scenario: ICommandAndResult): void {
            it("taco platform " + scenario.command + " executes with no error", function(done: MochaDone): void {
                var args: string[] = scenario.command.split(" ");
                platformRun(args)
                    .then(function(telemetryParameters: TacoUtility.ICommandTelemetryProperties): Q.Promise<any> {
                        // Wait for 5 seconds after the installation to avoid false negatives in version checking                  
                        telemetryParameters.should.be.eql(scenario.expectedTelemetryProperties);
                        return sleep(5);
                    }).then(function(): void {
                        if (args[0] === "add") {
                            // Check the version of platform after addition
                            checkPlatformVersions(scenario.expectedVersions, kitProjectpath);
                        }
                    }).then(function(): void {
                        done();
                    }, function(err: TacoUtility.TacoError): void {
                        done(err);
                    });
            });
        });
        kitPluginOperations.forEach(function(scenario: ICommandAndResult): void {
            it("taco plugin " + scenario.command + " executes with no error", function(done: MochaDone): void {
                var args: string[] = scenario.command.split(" ");
                pluginRun(args)
                    .then(function(telemetryParameters: TacoUtility.ICommandTelemetryProperties): Q.Promise<any> {
                        // Wait for 5 seconds after the installation to avoid false negatives in version checking                  
                        telemetryParameters.should.be.eql(scenario.expectedTelemetryProperties);
                        return sleep(5);
                    }).then(function(): void {
                        if (args[0] === "add") {
                            // Check the version of plugin after addition
                            checkPluginVersions(scenario.expectedVersions, kitProjectpath);
                        }
                    }).then(function(): void {
                        done();
                    }, function(err: TacoUtility.TacoError): void {
                        done(err);
                    });
            });
        });
    });

    describe("taco platform/plugin operation for a CLI project with no platform/plugin overrides execute with no errors", function(): void {
        var cliProjectPath: string;
        this.timeout(70000);
        before(function(mocha: MochaDone): void {
            createCliProject("5.0.0")
                .then(function(): void {
                    cliProjectPath = path.join(tacoHome, cliProjectDir);
                    process.chdir(cliProjectPath);
                    mocha();
                });
        });

        after(function(done: MochaDone): void {
            rimraf(cliProjectPath, function(err: Error): void { done(); }); // ignore errors
        });

        cliPlatformOperations.forEach(function(scenario: ICommandAndResult): void {
            it("taco platform " + scenario.command + " executes with no error", function(done: MochaDone): void {
                var args: string[] = scenario.command.split(" ");
                platformRun(args)
                    .then(function(telemetryParameters: TacoUtility.ICommandTelemetryProperties): Q.Promise<any> {
                        // Wait for 5 seconds after the installation to avoid false negatives in version checking                  
                        telemetryParameters.should.be.eql(scenario.expectedTelemetryProperties);
                        return sleep(5);
                    }).then(function(): void {
                        if (args[0] === "add") {
                            // Check the version of platform after addition
                            checkPlatformVersions(scenario.expectedVersions, cliProjectPath);
                        }
                    }).then(function(): void {
                        done();
                    }, function(err: TacoUtility.TacoError): void {
                        done(err);
                    });
            });
        });
        cliPluginOperations.forEach(function(scenario: ICommandAndResult): void {
            it("taco plugin " + scenario.command + " executes with no error", function(done: MochaDone): void {
                var args: string[] = scenario.command.split(" ");
                pluginRun(args)
                    .then(function(telemetryParameters: TacoUtility.ICommandTelemetryProperties): Q.Promise<any> {
                        // Wait for 5 seconds after the installation to avoid false negatives in version checking                  
                        telemetryParameters.should.be.eql(scenario.expectedTelemetryProperties);
                        return sleep(5);
                    }).then(function(): void {
                        if (args[0] === "add") {
                            // Check the version of plugin after addition
                            checkPluginVersions(scenario.expectedVersions, cliProjectPath);
                        }
                    }).then(function(): void {
                        done();
                    }, function(err: TacoUtility.TacoError): void {
                        done(err);
                    });
            });
        });
    });

    describe("Onboarding experience", () => {
        // because of function overloading assigning "(buffer: string, cb?: Function) => boolean" as the type for
        // stdoutWrite just doesn't work
        var stdoutWrite = process.stdout.write; // We save the original implementation, so we can restore it later
        var memoryStdout: ms.MemoryStream;

        beforeEach(function(done: MochaDone): void {
            this.timeout(60000); // Instaling the node packages during create can take a long time

            // We create a taco project outside of the test
            Q.fcall(createCliProject, "5.0.0").done(() => {
                // After the taco project is created, we initialize the console, so we won't get the creation messages in the console
                memoryStdout = new ms.MemoryStream; // Each individual test gets a new and empty console
                process.stdout.write = memoryStdout.writeAsFunction(); // We'll be printing into an "in-memory" console, so we can test the output
                done();
            }, function(err: any): void {
                done(err);
            });
        });

        after(() => {
            // We just need to reset the stdout just once, after all the tests have finished
            process.stdout.write = stdoutWrite;
        });

        function testCommandForArguments(commandRun: { (args: string[]): Q.Promise<any> },
            platformCommandLineArguments: string[], scenarioArguments: string[],
            alternativeScenarioArguments: string[], done: MochaDone): void {
            // Some messages are only printed the first time something is executed. When we run all the tests
            // all those messages don't get printed, but if we only run the onboarding tests, they are the first
            // tests to run, so they do get printed. We accept both options and we validate we got one of them
            commandRun(platformCommandLineArguments).done(() => {
                var actual: string = memoryStdout.contentsAsText();

                if (scenarioArguments.every((msg: string) => actual.indexOf(msg) >= 0) || alternativeScenarioArguments.every((msg: string) => actual.indexOf(msg) >= 0)) {
                    done();
                } else {
                    done(new Error("Bad onboarding for " + platformCommandLineArguments));
                }
            }, (err: any) => {
                done(err);
            });
        }

        it("prints the onboarding experience when adding a platform", function(done: MochaDone): void {
            this.timeout(10000); // Instaling the android platform can take several seconds. Setting the timeout on the test-suit is not working

            var firstPart: string[] = ["CommandPlatformStatusAdding"];
            var lastPart: string[] = [
                "CommandPlatformStatusAdded",
                "OnboardingExperienceTitle",
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
            testCommandForArguments(platformRun, ["add", "android"],
                firstPart.concat(lastPart),
                lastPart,
                done);
        });

        it("prints the onboarding experience when adding a plugin", function(done: MochaDone): void {
            this.timeout(10000); // Instaling the android platform can take several seconds. Setting the timeout on the test-suit is not working

            var firstPart: string[] = [
                "CommandPluginTestedPlatforms",
                "CommandPluginStatusAdding"];
            var lastPart: string[] = [
                "CommandPluginWithIdStatusAdded",
                "OnboardingExperienceTitle",
                " * HowToUseCommandInstallReqsPlugin",
                " * HowToUseCommandSetupRemote",
                " * HowToUseCommandBuildPlatform",
                " * HowToUseCommandEmulatePlatform",
                " * HowToUseCommandRunPlatform",
                "",
                "HowToUseCommandHelp",
                "HowToUseCommandDocs",
                ""];
            testCommandForArguments(pluginRun, ["add", "cordova-plugin-camera"],
                firstPart.concat(lastPart),
                lastPart,
                done);
        });
    });
});

