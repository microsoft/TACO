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

/* tslint:disable:no-var-requires */
// var require needed for should module to work correctly
// Note not import: We don't want to refer to shouldModule, but we need the require to occur since it modifies the prototype of Object.
var shouldModule: any = require("should");
/* tslint:enable:no-var-requires */

import del = require ("del");
import fs = require ("fs");
import mocha = require ("mocha");
import readline = require ("readline");
import os = require ("os");
import path = require ("path");
import tacoKits = require ("taco-kits");
import tacoUtils = require ("taco-utils");
import Q = require ("q");
import rimraf = require ("rimraf");
import util = require ("util");

import KitMod = require ("../cli/kit");
import kitHelper = require ("../cli/utils/kitHelper");
import TacoErrorCodes = require ("../cli/tacoErrorCodes");
import TacoUtility = require ("taco-utils");
import TacoTestUtility = require ("taco-tests-utils");

import utils = TacoUtility.UtilHelper;
import TacoKitsErrorCodes = tacoKits.TacoErrorCode;
import TacoUtilsErrorCodes = tacoUtils.TacoErrorCode;

import commands = tacoUtils.Commands.ICommandData;
import CommandHelper = require ("./utils/commandHelper");
import ICommand = TacoUtility.Commands.ICommand;
import IKeyValuePair = TacoTestUtility.IKeyValuePair;
import TestProjectHelper = TacoTestUtility.ProjectHelper;

function kitRun(args: string[] = []): Q.Promise<TacoUtility.ICommandTelemetryProperties> {
        var kit: ICommand = CommandHelper.getCommand("kit");
        return kit.run(args);
    }

    var previous: boolean;
    var runFolder: string = path.resolve(os.tmpdir(), "taco_cli_kit");
    var tacoHome: string = path.join(runFolder, "taco_home");
    var cliProjectDir: string = "cliProject";
    var kitProjectDir: string = "kitProject";
    var tempJson: string = path.resolve(runFolder, "temp.json");
    var originalCwd: string;

    var expectedCliTacoJsonKeyValues1: IKeyValuePair<string> = {
        "cordova-cli": "4.3.1"
    };

    var expectedCliTacoJsonKeyValues2: IKeyValuePair<string> = {
        "cordova-cli": "5.1.1"
    };

    var expectedCliTacoJsonKeyValues3: IKeyValuePair<string> = {
        "cordova-cli": "5.4.0"
    };

    var expectedKitTacoJsonKeyValues: IKeyValuePair<string> = {
        kit: "5.1.1-Kit", "cordova-cli": "5.1.1"
    };

    var expectedKitPlatformVersion: IKeyValuePair<string> = {
        android: "4.0.2"
    };

    var expectedKitPluginVersion: IKeyValuePair<string> = {
        "cordova-plugin-camera": "1.2.0"
    };

    function createProject(args: string[], projectDir: string): Q.Promise<any> {
        var create: ICommand = CommandHelper.getCommand("create");
        // Create a dummy test project with no platforms added
        utils.createDirectoryIfNecessary(tacoHome);
        process.chdir(tacoHome);
        return Q.denodeify(del)(projectDir).then(function (): Q.Promise<any> {
            return create.run(args);
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

    function platformRun(args: string[]): Q.Promise<any> {
        var platform: ICommand = CommandHelper.getCommand("platform");
        return platform.run(args);
    }

    function pluginRun(args: string[]): Q.Promise<any> {
        var plugin: ICommand = CommandHelper.getCommand("plugin");
        return plugin.run(args);
    }

    function addPlatformToProject(platfromName: string, projectPath: string): Q.Promise<any> {
        process.chdir(projectPath);
        return platformRun(["add", platfromName]);
    }

    function addTestPluginsToProject(projectPath: string): Q.Promise<any> {
        process.chdir(projectPath);
        return pluginRun(["add", "cordova-plugin-camera"])
        .then(function(): Q.Promise<any> {
            // cordova.raw.plugin("add", [...]) returns before the plugin is actually added.
            // So, a delay is required here to ensure that the plugins are indeed added 
            return sleep(100);
        }).then(function (): Q.Promise<any> {
            var medicPluginTestsPath = path.resolve(".", "plugins", "cordova-plugin-camera", "tests");
            var pluginCommandArgs: string[] = ["add", medicPluginTestsPath];
            return pluginRun(pluginCommandArgs);
        });
    }

    function getMockYesOrNoHandler(errorHandler: (err: Error) => void, onClose: () => void, desiredResponse: string): KitMod.IMockReadLine {
        return {
            question: function (question: string, callback: (answer: string) => void): void {
                switch (question) {
                    case "CommandKitSelectProjectUpdatePrompt":
                        callback(desiredResponse);
                        break;
                    default:
                        errorHandler(new Error("Unexpected query!"));
                }
            },
           close: onClose
        };
    }

    function sleep(milliseconds: number): Q.Promise<any> {
        return Q.delay(milliseconds);
    }

    function runKitCommandSuccessCaseAndVerifyTacoJson(args: string[],
        tacoJsonPath: string, tacoJsonKeyValues: IKeyValuePair<string>): Q.Promise<TacoUtility.ICommandTelemetryProperties> {
        return kitRun(args)
        .then((telemetryParameters: TacoUtility.ICommandTelemetryProperties) => {
            fs.existsSync(tacoJsonPath).should.be.true;

            var tacoJson: IKeyValuePair<string> = JSON.parse(fs.readFileSync(tacoJsonPath, { encoding: "utf-8" }));
            tacoJsonKeyValues.should.be.eql(tacoJson);
            return telemetryParameters;
        });
    }

    function runKitCommandFailureCaseAndVerifyTacoJson<T>(args: string[],
        tacoJsonPath: string, tacoJsonKeyValues: IKeyValuePair<string>, expectedErrorCode: T): Q.Promise<any> {
        return kitRun(args)
        .then(function (): void {
                throw new Error("Scenario succeeded when it should have failed");
        }, function (err: tacoUtils.TacoError): void {
            err.errorCode.should.equal(expectedErrorCode);

            // Also make sure that the project's taco.json
            // file exists and has the expected values

            fs.existsSync(tacoJsonPath).should.be.true;
            var tacoJson: IKeyValuePair<string> = JSON.parse(fs.readFileSync(tacoJsonPath, { encoding: "utf-8" }));
            tacoJsonKeyValues.should.be.eql(tacoJson);
        });
    }

describe("Kit command: ", function (): void {
    before(() => {
        originalCwd = process.cwd();

        previous = process.env["TACO_UNIT_TEST"];
        process.env["TACO_UNIT_TEST"] = true;

        // Use a dummy home location so we don't trash any real configurations
        process.env["TACO_HOME"] = tacoHome;

        // Force KitHelper to fetch the package fresh
        kitHelper.kitPackagePromise = null;
        rimraf.sync(runFolder);
    });

    after(() => {
        process.env["TACO_UNIT_TEST"] = previous;
        process.chdir(originalCwd);
        kitHelper.kitPackagePromise = null;
        rimraf.sync(runFolder); // ignore errors
    });

    describe("Kit list command : ", function (): void {
        it("'taco kit' should not throw any error", function (): Q.Promise<any> {
            return kitRun()
                .then((telemetryParameters: TacoUtility.ICommandTelemetryProperties) => {
                    var expected: TacoUtility.ICommandTelemetryProperties = { subCommand: { isPii: false, value: "list" } };
                    telemetryParameters.should.be.eql(expected);
                });
        });

        it("'taco kit list' should not throw any error", function (): Q.Promise<any> {
            return kitRun(["list"])
                .then((telemetryParameters: TacoUtility.ICommandTelemetryProperties) => {
                    var expected: TacoUtility.ICommandTelemetryProperties = { subCommand: { isPii: false, value: "list" } };
                    telemetryParameters.should.be.eql(expected);
                });
        });

        it("'taco kit list --kit {kit-ID}' should not throw any error", function (): Q.Promise<any> {
            return kitRun(["list", "--kit", "5.1.1-Kit"])
                .then((telemetryParameters: TacoUtility.ICommandTelemetryProperties) => {
                    var expected: TacoUtility.ICommandTelemetryProperties = {
                        subCommand: { isPii: false, value: "list" },
                        "options.kit": { isPii: false, value: "5.1.1-Kit" }
                    };
                    telemetryParameters.should.be.eql(expected);
                });
        });

        it("'taco kit list --json {path}' should generate the JSON", function (): Q.Promise<any> {
            return kitRun(["list", "--json", tempJson])
                .then((telemetryParameters: TacoUtility.ICommandTelemetryProperties) => {
                    fs.existsSync(tempJson).should.be.true;
                    var expected: TacoUtility.ICommandTelemetryProperties = {
                        subCommand: { isPii: false, value: "list" },
                        "options.json": { isPii: true, value: tempJson }
                    };
                    telemetryParameters.should.be.eql(expected);
                });
        });
    });

    it("'taco kit list should work for a project UTF16 taco.json", function (): Q.Promise<any> {
        var kitProjectpath: string = path.join(tacoHome, kitProjectDir);
        var tacoJsonPath: string = path.resolve(kitProjectpath, "taco.json");
        // Create a kit project, modify taco.json encoding and run taco kit list
        return createKitProject("5.1.1-Kit")
            .then(function(): Q.Promise<any> {
                // change the encoding to UTF 16
                var tacoJsonContents: string = fs.readFileSync(tacoJsonPath).toString();
                fs.writeFileSync(tacoJsonPath, new Buffer(tacoJsonContents, "utf16le"));
                return kitRun(["list"]);
            })
            .then((telemetryParameters: TacoUtility.ICommandTelemetryProperties) => {
                var expected: TacoUtility.ICommandTelemetryProperties = { subCommand: { isPii: false, value: "list" } };
                telemetryParameters.should.be.eql(expected);
            });
    });

    describe("Kit project to a cli project: ", function (): void {
        var kitProjectpath: string = path.join(tacoHome, kitProjectDir);
        var tacoJsonPath: string = path.resolve(kitProjectpath, "taco.json");

        before(function (done: MochaDone): void {
            createKitProject("5.1.1-Kit")
            .then(function (): Q.Promise<any> {
                return addPlatformToProject("android", kitProjectpath);
            })
            .then(function(): void {
                done();
                }, function(err: TacoUtility.TacoError): void {
                    done(err);
            });
        });

        after(function (done: MochaDone): void {
            process.chdir(tacoHome);
            rimraf(kitProjectpath, function (err: Error): void { done(); }); // ignore errors
        });

        it("'taco kit select --cordova {Invalid-CLI-VERSION}' should execute with expected errors", function (done: MochaDone): void {
            runKitCommandFailureCaseAndVerifyTacoJson<TacoErrorCodes>(["select", "--cordova", "InvalidCordovaCliVersion"], tacoJsonPath, expectedKitTacoJsonKeyValues, TacoErrorCodes.ErrorInvalidVersion)
                .done(() => done(), done);
        });

        it("'taco kit select --cordova {CLI-VERSION}' and a negative response to update query should fail with a warning", function (done: MochaDone): void {
            KitMod.yesOrNoHandler = getMockYesOrNoHandler(done, utils.emptyMethod, "PromptResponseNo");
            runKitCommandFailureCaseAndVerifyTacoJson(["select", "--cordova", "4.3.1"], tacoJsonPath, expectedKitTacoJsonKeyValues, 0 /* Command should fail with a warning */)
                .done(() => done(), done);
        });

        it("'taco kit select --cordova {CLI-VERSION}' on a project with a platform added, should execute with no errors", function (done: MochaDone): void {
            KitMod.yesOrNoHandler = getMockYesOrNoHandler(done, utils.emptyMethod, "PromptResponseYes");
            runKitCommandSuccessCaseAndVerifyTacoJson(["select", "--cordova", "5.4.0"], tacoJsonPath, expectedCliTacoJsonKeyValues3)
                .then(function(telemetryParameters: TacoUtility.ICommandTelemetryProperties): void {
                    var expected: TacoUtility.ICommandTelemetryProperties = {
                        subCommand: { isPii: false, value: "select" },
                        "options.cordova": { isPii: false, value: "5.4.0" }
                    };
                    telemetryParameters.should.be.eql(expected);
                })
                .done(() => done(), done);
        });
    });

    describe("CLI project to a Kit project: ", function (): void {
        var cliProjectpath: string = path.join(tacoHome, cliProjectDir);
        var tacoJsonPath: string = path.resolve(cliProjectpath, "taco.json");

        before(function (done: MochaDone): void {
            createCliProject("5.1.1")
            .then(function (): Q.Promise<any> {
                return addPlatformToProject("android", cliProjectpath);
            })
            .then(function(): void {
                    done();
                }, function(err: TacoUtility.TacoError): void {
                    done(err);
            });
        });

        after(function (done: MochaDone): void {
            process.chdir(tacoHome);
            rimraf(cliProjectpath, function (err: Error): void { done(); }); // ignore errors
        });

        it("'taco kit select --kit {Invalid-kit-ID}' should execute with expected error", function (done: MochaDone): void {
            runKitCommandFailureCaseAndVerifyTacoJson<TacoKitsErrorCodes>(["select", "--kit", "InvalidKit"], tacoJsonPath, expectedCliTacoJsonKeyValues2, TacoKitsErrorCodes.TacoKitsExceptionInvalidKit)
                .done(() => done(), done);
        });

        it("'taco kit select --kit {kit-ID}' followed by a positive response to platform/plugin update query should should execute with no errors", function (done: MochaDone): void {
            KitMod.yesOrNoHandler = getMockYesOrNoHandler(done, utils.emptyMethod, "PromptResponseYes");
            return addTestPluginsToProject(cliProjectpath)
            .then(function (): Q.Promise<any> {
                return runKitCommandSuccessCaseAndVerifyTacoJson(["select", "--kit", "5.1.1-Kit"], tacoJsonPath, expectedKitTacoJsonKeyValues);
            })
            .then(function(telemetryParameters: TacoUtility.ICommandTelemetryProperties): void {
                var expected = {
                    subCommand: { isPii: false, value: "select" },
                    "options.kit": { isPii: false, value: "5.1.1-Kit" }
                };
                telemetryParameters.should.be.eql(expected);
                TestProjectHelper.checkPlatformVersions(expectedKitPlatformVersion, cliProjectpath);
                TestProjectHelper.checkPluginVersions(expectedKitPluginVersion, cliProjectpath);
            }).done(() => done(), done);
        });
    });
});
