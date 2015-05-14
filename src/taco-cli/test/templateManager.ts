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

import archiver = require ("archiver");
import fs = require ("fs");
import mocha = require ("mocha");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import rimraf = require ("rimraf");
// Note not import: We don't want to refer to should_module, but we need the require to occur since it modifies the prototype of Object.
var should_module = require("should");
import wrench = require ("wrench");
import zlib = require ("zlib");

import resources = require ("../resources/resourceManager");
import tacoKits = require ("taco-kits");
import tacoUtils = require ("taco-utils");
import templateManager = require ("../cli/utils/templateManager");

import kitHelper = tacoKits.KitHelper;
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
    var templateCache: string = path.join(tacoHome, "templates");
    var cachedTestTemplate: string = path.join(templateCache, testKitId, testTemplateId);
    var testTemplateKitSrc: string = path.resolve(__dirname, "resources", "templates", testKitId);
    var testTemplateSrc: string = path.join(testTemplateKitSrc, testTemplateId);
    var testTemplateArchiveFolder: string = path.join(runFolder, "template-archives", testKitId);
    var testTemplateArchive: string = path.join(testTemplateArchiveFolder, testTemplateId + ".zip");

    // ITemplateOverrideInfo objects
    var testTemplateOverrideInfo: TacoKits.ITemplateOverrideInfo = {
        kitId: testKitId,
        templateId: testTemplateId,
        templateInfo: {
            name: {
                en: testDisplayName
            },
            url: testTemplateArchive
        }
    };

    var testTemplateOverrideInfo2: TacoKits.ITemplateOverrideInfo = {
        kitId: testKitId,
        templateId: testTemplateId2,
        templateInfo: {
            name: {
                en: testDisplayName2
            },
            url: testTemplateArchive
        }
    };

    var testTemplateOverrideInfo3: TacoKits.ITemplateOverrideInfo = {
        kitId: testKitId,
        templateId: testTemplateId3,
        templateInfo: {
            name: {
                en: testDisplayName3
            },
            url: testTemplateArchive
        }
    };

    // Mock for the KitHelper
    var mockKitHelper: TacoKits.IKitHelper = {
        getTemplateOverrideInfo: function (kitId: string, templateId: string): Q.Promise<TacoKits.ITemplateOverrideInfo> {
            // As this test suite is strictly testing the TemplateManager, we ignore the provided kitId and templateId parameters; we are only interested in
            // testing what the templateManager does with the returned testTemplateOverrideInfo, so we return a hard-coded one
            return Q.resolve(testTemplateOverrideInfo);
        },

        getTemplatesForKit: function (kitId: string): Q.Promise<TacoKits.IKitTemplatesOverrideInfo> {
            var templateOverrides: TacoKits.ITemplateOverrideInfo[] = [testTemplateOverrideInfo, testTemplateOverrideInfo2, testTemplateOverrideInfo3];
            var kitTemplatesOverrideInfo: TacoKits.IKitTemplatesOverrideInfo = {
                kitId: testKitId,
                templates: templateOverrides
            };

            return Q.resolve(kitTemplatesOverrideInfo);
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

                archive.on("error", function (err: Error): void {
                    done(err);
                });

                outputStream.on("close", function (): void {
                    done();
                });

                archive.pipe(outputStream);
                archive.directory(testTemplateSrc, testTemplateId).finalize();
            }
        });
    });

    after(function (done: MochaDone): void {
        // Delete run folder
        rimraf(runFolder, done);
    });

    describe("findTemplatePath()", function (): void {
        afterEach(function (done: MochaDone): void {
            // Clear the template cache
            rimraf(templateCache, done);
        });

        it("should correctly find a template that is already cached", function (done: MochaDone): void {
            // Create a test TemplateManager
            var templates: templateManager = new templateManager(mockKitHelper, templateCache);

            // Make sure the template cache is empty
            fs.existsSync(templateCache).should.be.exactly(false, "Test template cache must be initially empty for this test");

            // Manually create a template in the cache, which has the same name as the test template but only contains a single file
            var copySrc: string = path.join(testTemplateSrc, "a.txt");
            var copyDest: string = path.join(cachedTestTemplate, "a.txt");

            wrench.mkdirSyncRecursive(cachedTestTemplate, 511); // 511 decimal is 0777 octal
            utils.copyFile(copySrc, copyDest)
                .then(function (): string {
                    // Call findTemplatePath()
                    return (<any>templates).findTemplatePath(testTemplateId, testKitId, testTemplateOverrideInfo.templateInfo);
                })
                .then(function (cachedTemplatePath: string): void {
                    // Verify the returned path is correct
                    cachedTemplatePath.should.equal(cachedTestTemplate);

                    // Verify the TemplateManager didn't re-extract the template to the cache: the cached template should only contain the single file we placed there
                    // at the start of this test, "a.txt", otherwise it means the TemplateManager re-extracted the template even though it was already cached
                    fs.existsSync(path.join(cachedTestTemplate, "folder1")).should.be.exactly(false, "The template archive should not have been re-extracted to the cache");
                    done();
                })
                .catch(function (err: string): void {
                    done(new Error(err));
                });
        });

        it("should correctly find and cache a template that is not already cached", function (done: MochaDone): void {
            // Create a test TemplateManager
            var templates: templateManager = new templateManager(mockKitHelper, templateCache);

            // Make sure the template cache is empty
            fs.existsSync(templateCache).should.equal(false, "Test template cache must be initially empty for this test");

            // Call findTemplatePath()
            (<any>templates).findTemplatePath(testTemplateId, testKitId, testTemplateOverrideInfo.templateInfo)
                .then(function (cachedTemplatePath: string): void {
                    // Verify the returned path is correct
                    cachedTemplatePath.should.equal(cachedTestTemplate);

                    // Verify the TemplateManager correctly extracted the template archive to the cache
                    fs.existsSync(path.join(cachedTestTemplate, "a.txt")).should.be.exactly(true, "The template was not correctly cached (missing some files)");
                    fs.existsSync(path.join(cachedTestTemplate, "folder1", "b.txt")).should.be.exactly(true, "The template was not correctly cached (missing some files)");
                    done();
                })
                .catch(function (err: string): void {
                    done(new Error(err));
                });
        });

        it("should return the appropriate error when templates are not available", function (done: MochaDone): void {
            // Create a test TemplateManager
            var templates: templateManager = new templateManager(mockKitHelper, templateCache);

            // Call findTemplatePath() with an ITemplateInfo that contains an archive path pointing to a location that doesn't exist
            var invalidTemplateInfo: TacoKits.ITemplateInfo = {
                name: {
                    en: testDisplayName
                },
                url: path.join(runFolder, "pathThatDoesntExist")
            };

            (<any>templates).findTemplatePath(testTemplateId, testKitId, invalidTemplateInfo)
                .then(function (cachedTemplatePath: string): void {
                    // The promise was resolved, this is an error
                    done(new Error("The operation completed successfully when it should have returned an error"));
                }, function (error: TacoUtility.TacoError): void {
                    error.message.should.equal("CommandCreateTemplatesUnavailable");
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
            var lr = new wrench.LineReader(filePath);
            var lineNumber = 0;

            while (lr.hasNextLine()) {
                var currentLine: string = lr.getNextLine().trim();
                var correctLine = replacedLines[lineNumber];

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
            var testProjectPath = path.join(runFolder, "testProject");

            wrench.mkdirSyncRecursive(testProjectPath, 511); // 511 decimal is 0777 octal
            utils.copyRecursive(testTemplateSrc, testProjectPath)
                .then(function (): string {
                    // Call performTokenReplacement()
                    return (<any>templateManager).performTokenReplacements(testProjectPath, testAppId, testAppName);
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
            var templates: templateManager = new templateManager(mockKitHelper, templateCache);

            // Build the expected result
            var expectedResult: templateManager.ITemplateList = {
                kitId: testKitId,
                templates: [
                    {
                        id: testTemplateOverrideInfo.templateId,
                        name: testTemplateOverrideInfo.templateInfo.name["en"]
                    },
                    {
                        id: testTemplateOverrideInfo2.templateId,
                        name: testTemplateOverrideInfo2.templateInfo.name["en"]
                    },
                    {
                        id: testTemplateOverrideInfo3.templateId,
                        name: testTemplateOverrideInfo3.templateInfo.name["en"]
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
});