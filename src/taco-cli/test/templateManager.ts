/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */
/// <reference path="../../typings/archiver.d.ts"/>
/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/rimraf.d.ts"/>
/// <reference path="../../typings/should.d.ts"/>
/// <reference path="../../typings/tacoKits.d.ts"/>
/// <reference path="../../typings/tacoUtils.d.ts"/>
/// <reference path="../../typings/wrench.d.ts"/>

"use strict";

/* tslint:disable:no-var-requires */
// var require needed for should module to work correctly
// Note not import: We don't want to refer to shouldModule, but we need the require to occur since it modifies the prototype of Object.
var shouldModule: any = require("should");
/* tslint:enable:no-var-requires */

import archiver = require ("archiver");
import fs = require ("fs");
import mocha = require ("mocha");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import rimraf = require ("rimraf");
import wrench = require ("wrench");
import zlib = require ("zlib");

import resources = require ("../resources/resourceManager");
import TacoErrorCodes = require ("../cli/tacoErrorCodes");
import tacoUtils = require ("taco-utils");
import templateManager = require ("../cli/utils/templateManager");
import utils = tacoUtils.UtilHelper;

describe("TemplateManager", function (): void {
    // Template info
    var testTemplateId: string = "testTemplate";
    var testTemplateId2: string = "testTemplate2";
    var testTemplateId3: string = "testTemplate3";
    var testKitId: string = "testKit";
    var testDisplayName: string = "Blank template for the Default kit";
    var testDisplayName2: string = "Blank Typescript template for the Default kit";
    var testDisplayName3: string = "Azure conencted services template for the Default kit";

    // Project info
    var testAppId: string = "testId";
    var testAppName: string = "testAppName";

    // Important paths
    var runFolder: string = path.resolve(os.tmpdir(), "taco_cli_templates_test_run");
    var tacoHome: string = path.join(runFolder, "taco_home");
    var testTemplateKitSrc: string = path.resolve(__dirname, "resources", "templates", testKitId);
    var testTemplateNoWwwPath: string = path.join(testTemplateKitSrc, testTemplateId);
    var testTemplateWithWwwPath: string = path.join(testTemplateKitSrc, testTemplateId2);
    var testTemplateWithGitFilesPath: string = path.join(testTemplateKitSrc, testTemplateId3);
    var testTemplateArchiveFolder: string = path.join(runFolder, "template-archives", testKitId);
    var testTemplateArchive: string = path.join(testTemplateArchiveFolder, testTemplateId + ".zip");

    // ITemplateOverrideInfo objects
    var testTemplateOverrideInfo: TacoKits.ITemplateOverrideInfo = {
        kitId: testKitId,
        templateId: testTemplateId,
        templateInfo: {
            name: testDisplayName,
            url: testTemplateArchive
        }
    };

    var testTemplateOverrideInfo2: TacoKits.ITemplateOverrideInfo = {
        kitId: testKitId,
        templateId: testTemplateId2,
        templateInfo: {
            name: testDisplayName2,
            url: path.join(runFolder, "pathThatDoesntExist")
        }
    };

    var testTemplateOverrideInfo3: TacoKits.ITemplateOverrideInfo = {
        kitId: testKitId,
        templateId: testTemplateId3,
        templateInfo: {
            name: testDisplayName3,
            url: path.join(runFolder, "pathThatDoesntExist")
        }
    };

    // Mock for the KitHelper
    var mockKitHelper: TacoKits.IKitHelper = {
        getTemplateOverrideInfo: function (kitId: string, templateId: string): Q.Promise<TacoKits.ITemplateOverrideInfo> {
            switch (templateId) {
                case testTemplateId2:
                    return Q.resolve(testTemplateOverrideInfo2);
                case testTemplateId3:
                    return Q.resolve(testTemplateOverrideInfo3);
                default:
                    return Q.resolve(testTemplateOverrideInfo);
            }
        },

        getTemplatesForKit: function (kitId: string): Q.Promise<TacoKits.IKitTemplatesOverrideInfo> {
            var templateOverrides: TacoKits.ITemplateOverrideInfo[] = [testTemplateOverrideInfo, testTemplateOverrideInfo2, testTemplateOverrideInfo3];
            var kitTemplatesOverrideInfo: TacoKits.IKitTemplatesOverrideInfo = {
                kitId: testKitId,
                templates: templateOverrides
            };

            return Q.resolve(kitTemplatesOverrideInfo);
        },

        getAllTemplates: function (): Q.Promise<TacoKits.ITemplateOverrideInfo[]> {
            var templateOverrides: TacoKits.ITemplateOverrideInfo[] = [testTemplateOverrideInfo, testTemplateOverrideInfo2, testTemplateOverrideInfo3];

            return Q.resolve(templateOverrides);
        }
    };

    before(function (done: MochaDone): void {
        // Set ResourcesManager to test mode
        process.env["TACO_UNIT_TEST"] = true;

        // Delete existing run folder if necessary
        rimraf(runFolder, function (err: Error): void {
            if (err) {
                done(err);
            } else {
                // Create the run folder for our tests
                wrench.mkdirSyncRecursive(runFolder, 511); // 511 decimal is 0777 octal

                // Prepare the test template (archive it)
                wrench.mkdirSyncRecursive(testTemplateArchiveFolder, 511); // 511 decimal is 0777 octal

                var archive: any = archiver("zip");
                var outputStream: NodeJS.WritableStream = fs.createWriteStream(testTemplateArchive);

                archive.on("error", function (archiveError: Error): void {
                    done(archiveError);
                });

                outputStream.on("close", function (): void {
                    done();
                });

                archive.pipe(outputStream);
                archive.directory(testTemplateNoWwwPath, testTemplateId).finalize();
            }
        });
    });

    after(function (done: MochaDone): void {
        // Delete run folder
        rimraf(runFolder, done);
    });

    describe("acquireFromTacoKits()", function (): void {
        it("should correctly extract a template to a temporary directory", function (done: MochaDone): void {
            // Create a test TemplateManager
            var templates: templateManager = new templateManager(mockKitHelper, runFolder);

            // Call acquireFromTacoKits()
            (<any> templates).acquireFromTacoKits(testTemplateId, testKitId)
                .then(function (tempTemplatePath: string): void {
                    // Verify the returned path is under the right folder
                    tempTemplatePath.indexOf(runFolder).should.equal(0);

                    // Verify the directory starts with the proper prefix
                    path.basename(tempTemplatePath).indexOf("taco_template_").should.be.equal(0);

                    // Verify the TemplateManager correctly extracted the template archive to the temporary location
                    fs.existsSync(path.join(tempTemplatePath, "a.txt")).should.be.exactly(true, "The template was not correctly cached (missing some files)");
                    fs.existsSync(path.join(tempTemplatePath, "folder1", "b.txt")).should.be.exactly(true, "The template was not correctly cached (missing some files)");
                    done();
                })
                .catch(function (err: string): void {
                    done(new Error(err));
                });
        });

        it("should return the appropriate error when templates are not available", function (done: MochaDone): void {
            // Create a test TemplateManager
            var templates: templateManager = new templateManager(mockKitHelper, runFolder);

            // Call acquireFromTacoKits() with a template ID that has an archive path pointing to a location that doesn't exist
            (<any> templates).acquireFromTacoKits(testTemplateId3, testKitId)
                .then(function (tempTemplatePath: string): void {
                    // The promise was resolved, this is an error
                    done(new Error("The operation completed successfully when it should have returned an error"));
                }, function (error: TacoUtility.TacoError): void {
                    error.errorCode.should.equal(TacoErrorCodes.CommandCreateTemplatesUnavailable);
                    done();
                })
                .catch(function (err: string): void {
                    done(new Error(err));
                });
        });
    });

    describe("performTokenReplacements()", function (): void {
        var replacedLines: string[] = [
            "some text",
            testAppName,
            testAppId,
            "$appID$",
            "$randomToken$$$$",
            "more text",
            "<xml_node xml_attribute=\"" + testAppName + "\">" + testAppId + "</xml_node>"
        ];

        function verifyFileContent(filePath: string): void {
            var lr: wrench.LineReader = new wrench.LineReader(filePath);
            var lineNumber: number = 0;

            while (lr.hasNextLine()) {
                var currentLine: string = lr.getNextLine().trim();
                var correctLine: string = replacedLines[lineNumber];

                if (currentLine !== correctLine) {
                    fs.closeSync(lr.fd);
                    throw new Error("Line wasn't correctly replaced");
                }

                lineNumber++;
            }

            fs.closeSync(lr.fd);
        }

        it("should correctly replace all tokens in all files, recursively", function (done: MochaDone): void {
            // Copy template items to a new folder
            var testProjectPath: string = path.join(runFolder, "testProject");

            wrench.mkdirSyncRecursive(testProjectPath, 511); // 511 decimal is 0777 octal
            utils.copyRecursive(testTemplateNoWwwPath, testProjectPath)
                .then(function (): string {
                    // Call performTokenReplacement()
                    return (<any> templateManager).performTokenReplacements(testProjectPath, testAppId, testAppName);
                })
                .then(function (): void {
                    // Read both text files in the project and ensure replacements were correctly made
                    var fileA: string = path.join(testProjectPath, "a.txt");
                    var fileB: string = path.join(testProjectPath, "folder1", "b.txt");

                    verifyFileContent(fileA);
                    verifyFileContent(fileB);
                    done();
                })
                .catch(function (err: string): void {
                    done(new Error(err));
                });
        });
    });

    describe("getTemplatesForKit()", function (): void {
        it("should return the correct list of templates", function (done: MochaDone): void {
            // Create a test TemplateManager
            var templates: templateManager = new templateManager(mockKitHelper, runFolder);

            // Build the expected result
            var expectedResult: templateManager.ITemplateList = {
                kitId: testKitId,
                templates: [
                    {
                        id: testTemplateOverrideInfo.templateId,
                        name: testTemplateOverrideInfo.templateInfo.name
                    },
                    {
                        id: testTemplateOverrideInfo2.templateId,
                        name: testTemplateOverrideInfo2.templateInfo.name
                    },
                    {
                        id: testTemplateOverrideInfo3.templateId,
                        name: testTemplateOverrideInfo3.templateInfo.name
                    }
                ]
            };

            var expectedResultStringified: string = JSON.stringify(expectedResult);

            templates.getTemplatesForKit(testKitId)
                .then(function (templateList: templateManager.ITemplateList): void {
                    JSON.stringify(templateList).should.equal(expectedResultStringified);
                    done();
                })
                .catch(function (err: string): void {
                    done(new Error(err));
                });
        });
    });

    describe("getAllTemplates()", function (): void {
        it("should return all available templates", function (done: MochaDone): void {
            // Create a test TemplateManager
            var templates: templateManager = new templateManager(mockKitHelper, runFolder);

            // Build the expected result
            var expectedResult: templateManager.ITemplateList = {
                kitId: "",
                templates: [
                    {
                        id: testTemplateOverrideInfo.templateId,
                        name: testTemplateOverrideInfo.templateInfo.name
                    },
                    {
                        id: testTemplateOverrideInfo2.templateId,
                        name: testTemplateOverrideInfo2.templateInfo.name
                    },
                    {
                        id: testTemplateOverrideInfo3.templateId,
                        name: testTemplateOverrideInfo3.templateInfo.name
                    }
                ]
            };

            var expectedResultStringified: string = JSON.stringify(expectedResult);

            templates.getAllTemplates()
                .then(function (templateList: templateManager.ITemplateList): void {
                    JSON.stringify(templateList).should.equal(expectedResultStringified);
                    done();
                })
                .catch(function (err: string): void {
                    done(new Error(err));
                });
        });
    });

    describe("copyTemplateItemsToProject()", function (): void {
        var testProjectPath: string = path.join(runFolder, "testProject");

        beforeEach(function (): void {
            rimraf.sync(testProjectPath);
            wrench.mkdirSyncRecursive(testProjectPath, 511); // 511 decimal is 0777 octal
        });

        it("should copy items to the project when the template has a www folder", function (done: MochaDone): void {
            var templates: templateManager = new templateManager(mockKitHelper, runFolder);
            var cordovaParameters: Cordova.ICordovaCreateParameters = {
                appId: "test",
                appName: "test",
                cordovaConfig: {},
                projectPath: testProjectPath,
                copyFrom: testTemplateWithWwwPath
            };

            (<any> templateManager).copyTemplateItemsToProject(cordovaParameters)
                .then(function (): void {
                    // Since the template has a www folder, a copy should happen; there should be 4 items in the project: "www", "a.txt", "folder1", "b.txt"
                    try {
                        wrench.readdirSyncRecursive(testProjectPath).length.should.equal(4);
                    } catch (assertException) {
                        done(assertException);

                        return;
                    }
                    done();
                });
        });

        it("should skip the copy step when the template doesn't have a www folder", function (done: MochaDone): void {
            var templates: templateManager = new templateManager(mockKitHelper, runFolder);
            var cordovaParameters: Cordova.ICordovaCreateParameters = {
                appId: "test",
                appName: "test",
                cordovaConfig: {},
                projectPath: testProjectPath,
                copyFrom: testTemplateNoWwwPath
            };

            (<any> templateManager).copyTemplateItemsToProject(cordovaParameters)
                .then(function (): void {
                    // Template doesn't have a "www" folder, so the copy step should be skipped and resulting project should be empty
                    try {
                        wrench.readdirSyncRecursive(testProjectPath).length.should.equal(0);
                    } catch (assertException) {
                        done(assertException);

                        return;
                    }
                    done();
                });
        });

        it("should ignore git-specific files", function (done: MochaDone): void {
            var templates: templateManager = new templateManager(mockKitHelper, runFolder);
            var cordovaParameters: Cordova.ICordovaCreateParameters = {
                appId: "test",
                appName: "test",
                cordovaConfig: {},
                projectPath: testProjectPath,
                copyFrom: testTemplateWithGitFilesPath
            };

            (<any> templateManager).copyTemplateItemsToProject(cordovaParameters)
                .then(function (): void {
                    // Since the template has a www folder, a copy should happen; the 3 git files should be ignored, so there should be 4 items in the project: "www", "a.txt", "folder1", "b.txt"
                    try {
                        wrench.readdirSyncRecursive(testProjectPath).length.should.equal(4);
                    } catch (assertException) {
                        done(assertException);

                        return;
                    }
                    done();
                });
        });
    });
});
