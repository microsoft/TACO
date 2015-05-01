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
/// <reference path="../../typings/archiver.d.ts"/>
/// <reference path="../../typings/wrench.d.ts"/>
/// <reference path="../../typings/tacoUtils.d.ts"/>
/// <reference path="../../typings/tacoKits.d.ts"/>

"use strict";
var should_module = require("should"); // Note not import: We don't want to refer to should_module, but we need the require to occur since it modifies the prototype of Object.

import archiver = require ("archiver");
import fs = require ("fs");
import mocha = require ("mocha");
import os = require ("os");
import path = require ("path");
import rimraf = require ("rimraf");
import wrench = require ("wrench");
import zlib = require ("zlib");

import resources = require ("../resources/resourceManager");
import tacoKits = require ("taco-kits");
import tacoUtils = require ("taco-utils");
import templates = require ("../cli/utils/templateManager");

import kitHelper = tacoKits.KitHelper;
import utils = tacoUtils.UtilHelper;

interface IKitHelper {
    getTemplateOverrideInfo: (kitId: string, templateId: string) => Q.Promise<TacoKits.ITemplateInfo>;
}

describe("TemplateManager", function (): void {
    // Template info
    var testTemplateId: string = "testTemplate";
    var testKitId: string = "testKit";
    var testDisplayName: string = "Blank template for the Default kit";

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

    // ITemplateInfo object
    var templateInfo: TacoKits.ITemplateInfo = {
        name: testDisplayName,
        url: testTemplateArchive       
    };

    // Mock for the KitHelper
    var mockKitHelper: IKitHelper = {
        getTemplateOverrideInfo: function (kitId: string, templateId: string): Q.Promise<TacoKits.ITemplateInfo> {
            // As this test suite is strictly testing the TemplateManager, we ignore the provided kitId and templateId parameters; we are only interested in
            // testing what the templateManager does with the returned ITemplateInfo, so we return a hard-coded one
            return Q.resolve(templateInfo);
        }
    };

    before(function (done: MochaDone): void {
        // Set ResourcesManager to test mode
        process.env["TACO_UNIT_TEST"] = true;

        // Set the temporary template cache location in TemplateManager for our tests
        templates.TemplateCachePath = templateCache;

        // Mock the KitHelper in TemplateManager
        templates.Kits = mockKitHelper;
        
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

        // Reset TemplateManager
        templates.TemplateCachePath = null;
        templates.Kits = null;
    });

    describe("findTemplatePath()", function (): void {
        afterEach(function (done: MochaDone): void {
            // Clear the template cache
            rimraf(templateCache, done);
        });

        it("should correctly find a template that is already cached", function (done: MochaDone): void {
            // Make sure the template cache is empty
            fs.existsSync(templateCache).should.be.exactly(false, "Test template cache must be initially empty for this test");

            // Manually create a template in the cache, which has the same name as the test template but only contains a single file
            var copySrc: string = path.join(testTemplateSrc, "a.txt");
            var copyDest: string = path.join(cachedTestTemplate, "a.txt");

            wrench.mkdirSyncRecursive(cachedTestTemplate, 511); // 511 decimal is 0777 octal
            utils.copyFile(copySrc, copyDest).then(function (): string {
                // Call findTemplatePath()
                return (<any>templates).findTemplatePath(testTemplateId, testKitId, templateInfo);
            }).then(function (cachedTemplatePath: string): void {
                // Verify the returned path is correct
                cachedTemplatePath.should.equal(cachedTestTemplate);

                // Verify the TemplateManager didn't re-extract the template to the cache: the cached template should only contain the single file we placed there
                // at the start of this test, "a.txt", otherwise it means the TemplateManager re-extracted the template even though it was already cached
                fs.existsSync(path.join(cachedTestTemplate, "folder1")).should.be.exactly(false, "The template archive should not have been re-extracted to the cache");
                done();
            }).catch(function (err: string): void {
                done(new Error(err));
            });
        });

        it("should correctly find and cache a template that is not already cached", function (done: MochaDone): void {
            // Make sure the template cache is empty
            fs.existsSync(templateCache).should.equal(false, "Test template cache must be initially empty for this test");

            // Call findTemplatePath()
            (<any>templates).findTemplatePath(testTemplateId, testKitId, templateInfo).then(function (cachedTemplatePath: string): void {
                // Verify the returned path is correct
                cachedTemplatePath.should.equal(cachedTestTemplate);

                // Verify the TemplateManager correctly extracted the template archive to the cache
                fs.existsSync(path.join(cachedTestTemplate, "a.txt")).should.be.exactly(true, "The template was not correctly cached (missing some files)");
                fs.existsSync(path.join(cachedTestTemplate, "folder1", "b.txt")).should.be.exactly(true, "The template was not correctly cached (missing some files)");
                done();
            }).catch(function (err: string): void {
                done(new Error(err));
            });
        });

        it("should return the appropriate error when templates are not available", function (done: MochaDone): void {
            // Call findTemplatePath() with an ITemplateInfo that contains an archive path pointing to a location that doesn't exist
            var invalidTemplateInfo: TacoKits.ITemplateInfo = {
                name: testDisplayName,
                url: path.join(runFolder, "pathThatDoesntExist")
            };

            (<any>templates).findTemplatePath(testTemplateId, testKitId, invalidTemplateInfo).then(function (cachedTemplatePath: string): void {
                // The promise was resolved, this is an error
                done(new Error("The operation completed successfully when it should have returned an error"));
            }, function (error: string): void {
                error.should.equal("command.create.templatesUnavailable");
                done();
            }).catch(function (err: string): void {
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
            utils.copyRecursive(testTemplateSrc, testProjectPath).then(function (): string {
                // Call performTokenReplacement()
                return (<any>templates).performTokenReplacements(testProjectPath, testAppId, testAppName);
            }).then(function (): void {
                // Read both text files in the project and ensure replacements were correctly made
                var fileA: string = path.join(testProjectPath, "a.txt");
                var fileB: string = path.join(testProjectPath, "folder1", "b.txt");

                verifyFileContent(fileA);
                verifyFileContent(fileB);
                done();
            }).catch(function (err: string): void {
                done(new Error(err));
            });
        });
    });
});