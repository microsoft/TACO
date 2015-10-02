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

/* tslint:disable:no-var-requires */
// var require needed for should module to work correctly
// Note not import: We don't want to refer to shouldModule, but we need the require to occur since it modifies the prototype of Object.
var shouldModule = require("should");
/* tslint:enable:no-var-requires */

import os = require ("os");
import path = require ("path");

import installerUtils = require ("../utils/installerUtils");

describe("InstallerUtils", function (): void {
    // Important paths
    var testFile: string = path.join(__dirname, "test-data", "testFile.txt");
    var testFileSha1: string = "8b88752a4c77711efc9a742a2a4086e8480042a0";
    var testFileBytes: number = 3148;

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
        var testPathWin32: string = "C:\\some path with spaces;C:\\\\\\\\temp\\some path\\with spaces;C:\\some_folder\\some_nested_folder";
        var testPathDarwin: string = "/some path with spaces://///temp/some path/with spaces:/some_folder/some_nested_folder";
        var testPath: string = os.platform() === "win32" ? testPathWin32 : testPathDarwin;

        it("should correctly detect that a value is already in the path", function (): void {
            var pathToVerify1: string;
            var pathToVerify2: string;
            var pathToVerify3: string;

            if (os.platform() === "win32") {
                pathToVerify1 = "C:\\some path with spaces";
                pathToVerify2 = "C:\\temp\\some path\\with spaces";
                pathToVerify3 = "C:\\\\\\\\\\\\\\some_folder\\\\some_nested_folder";
            } else {
                pathToVerify1 = "/some path with spaces";
                pathToVerify2 = "/temp/some path/with spaces";
                pathToVerify3 = "////////some_folder//some_nested_folder";
            }

            installerUtils.pathContains(pathToVerify1, testPath).should.be.true;
            installerUtils.pathContains(pathToVerify2, testPath).should.be.true;
            installerUtils.pathContains(pathToVerify3, testPath).should.be.true;
        });

        it("should correctly detect that a value is not in the path", function (): void {
            var pathToVerify: string;

            if (os.platform() === "win32") {
                pathToVerify = "C:\\\\\\\\\\\\\\some_folder\\\\unknown";
            } else {
                pathToVerify = "////////some_folder//unknown";
            }

            installerUtils.pathContains(pathToVerify, testPath).should.be.false;
        });
    });

    describe("calculateFileSha1()", function (): void {
        it("should calculate the correct hash", function (): void {
            (<any> installerUtils).calculateFileSha1(testFile).should.be.exactly(testFileSha1);
        });
    });

    describe("getFileBytes()", function (): void {
        it("should calculate the correct file size in bytes", function (): void {
            (<any> installerUtils).getFileBytes(testFile).should.be.exactly(testFileBytes);
        });
    });
});
