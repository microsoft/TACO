/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/should.d.ts"/>

"use strict";

var should_module = require("should"); // Note not import: We don't want to refer to should_module, but we need the require to occur since it modifies the prototype of Object.

import os = require ("os");
import path = require ("path");

import installerUtils = require ("../utils/installerUtils");

describe("InstallerUtils", function (): void {
    // Important paths
    var testFile: string = path.join(__dirname, "test-data", "testFile.txt");
    var testFileSha1: string = "23cb44e140a3dadcc5e51e75dd3ffe84c242e3bc";
    var testFileBytes: number = 3212;

    describe("isFileClean()", function (): void {
        it("should return true when the specified file is clean", function (): void {
            var expectedSignature: installerUtils.IFileSignature = {
                sha1: testFileSha1,
                bytes: testFileBytes
            };

            installerUtils.isFileClean(testFile, expectedSignature).should.be.true;
        });

        it("should return false when the specified file isn't clean (wrong byte size)", function (): void {
            var expectedSignature: installerUtils.IFileSignature = {
                sha1: testFileSha1,
                bytes: 38127312738
            };

            installerUtils.isFileClean(testFile, expectedSignature).should.be.false;
        });

        it("should return false when the specified file isn't clean (wrong SHA1 signature)", function (): void {
            var expectedSignature: installerUtils.IFileSignature = {
                sha1: "abcdef1234567890",
                bytes: testFileBytes
            };

            installerUtils.isFileClean(testFile, expectedSignature).should.be.false;
        });
    });

    describe("pathContains()", function (): void {
        var root: string = os.platform() === "win32" ? "C:" : "/";
        var testPath: string = [
            path.join(root, "some path with space"),
            root + path.sep + path.sep + path.sep + path.sep + "temp" + path.sep + "some path" + path.sep + "with spaces",
            path.join(root, "some_folder", "some_nested_folder")
        ].join(path.delimiter);

        it("should correctly detect that a value is already in the path", function (): void {
            var pathToVerify1: string = path.join(root, "some path with space");
            var pathToVerify2: string = path.join(root, "temp", "some path", "with spaces");
            var pathToVerify3: string = root + path.sep + path.sep + path.sep + path.sep + path.sep + path.sep + path.sep + "some_folder" + path.sep + path.sep + "some_nested_folder";

            process.env["Path"] = testPath;

            installerUtils.pathContains(pathToVerify1, testPath).should.be.true;
            installerUtils.pathContains(pathToVerify2, testPath).should.be.true;
            installerUtils.pathContains(pathToVerify3, testPath).should.be.true;
        });

        it("should correctly detect that a value is not in the path", function (): void {
            var pathToVerify: string = root + path.sep + path.sep + path.sep + path.sep + path.sep + path.sep + path.sep + "some_folder" + path.sep + path.sep + "unknown";

            installerUtils.pathContains(pathToVerify, testPath).should.be.false;
        });
    });

    describe("calculateFileSha1()", function (): void {
        it("should calculate the correct hash", function (): void {
            (<any>installerUtils).calculateFileSha1(testFile).should.be.exactly(testFileSha1);
        });
    });

    describe("getFileBytes()", function (): void {
        it("should calculate the correct file size in bytes", function (): void {
            (<any>installerUtils).getFileBytes(testFile).should.be.exactly(testFileBytes);
        });
    });
});