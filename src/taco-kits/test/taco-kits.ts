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
/// <reference path="../../typings/taco-utils.d.ts"/>
/// <reference path="../../typings/taco-kits.d.ts"/>

"use strict";
var should_module = require("should"); // Note not import: We don't want to refer to should_module, but we need the require to occur since it modifies the prototype of Object.

import mocha = require ("mocha");
import path = require ("path");
import zlib = require ("zlib");
import fs = require ("fs");
import os = require ("os");
import tacoUtils = require ("taco-utils");
import utils = tacoUtils.UtilHelper;
import resources = tacoUtils.ResourcesManager;
import rimraf = require ("rimraf");
import wrench = require ("wrench");
import archiver = require ("archiver");
import tacoKits = require("../taco-kits");
import kitHelper = tacoKits.KitHelper;


describe("KitHelper", function (): void {
    // Test Kit Info
    var testDefaultKitId: string = "testTemplate";
    var testKitId: string = "4.2.0-Kit";
    var testKitInfo: tacoKits.IKitInfo = {

    };
    var testTemplateOverrideInfo: tacoKits.ITemplateOverrideInfo = {
    };

    var testPlatformOverrideMetadata: tacoKits.IPlatformOverrideMetadata = {
    };
    var testPluginOverrideMetadata: tacoKits.IPluginOverrideMetadata = {
    };

    // Important paths
    var runFolder: string = path.resolve(os.tmpdir(), "taco_kits");
    var tacoHome: string = path.join(runFolder, "taco_home");

    before(function (done: MochaDone): void {
        // Set ResourcesManager to test mode
        resources.UnitTest = true;

        // Set the kit metadata file location
        kitHelper.KitMetadataFilePath = path.resolve("..", "test-data", "test-kit-metadata.json");

        // Delete existing run folder if necessary
        rimraf(runFolder, function (err: Error): void {
            if (err) {
                done(err);
            } else {
                // Create the run folder for our tests
                wrench.mkdirSyncRecursive(runFolder, 511); // 511 decimal is 0777 octal
            }
        });
    });

    after(function (done: MochaDone): void {
        // Delete run folder
        rimraf(runFolder, done);

        // Reset TemplateManager
        kitHelper.KitMetadataFilePath = null;
    });

    describe("getKitMetadata()", function (): void {
        afterEach(function (done: MochaDone): void {
            // Clear the template cache
            rimraf(templateCache, done);
        });

        it("must return the right kit metadata for the kit ID passed", function (done: MochaDone): void {
            // Call findTemplatePath()
            return (<any>kitHelper).getKitMetadata();
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