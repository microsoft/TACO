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
var should_module = require("should"); // Note not import: We don"t want to refer to should_module, but we need the require to occur since it modifies the prototype of Object.

import AdmZip = require ("adm-zip");
import del = require ("del");
import fs = require ("fs");
import http = require ("http");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import querystring = require ("querystring");
import rimraf = require ("rimraf");
import util = require ("util");

import buildMod = require ("../cli/build");
import createMod = require ("../cli/create");
import kitHelper = require ("../cli/utils/kitHelper");
import mockCordova = require ("./utils/mockCordova");
import Platform = require ("../cli/platform");
import resources = require ("../resources/resourceManager");
import ServerMock = require ("./utils/serverMock");
import Settings = require ("../cli/utils/settings");
import RemoteBuildClientHelper = require ("../cli/remoteBuild/remoteBuildClientHelper");
import RemoteMock = require ("./utils/remoteMock");
import TacoUtility = require ("taco-utils");

import BuildInfo = TacoUtility.BuildInfo;
import utils = TacoUtility.UtilHelper;

var build = new buildMod();
var create = new createMod();

interface IExpectedRequest {
    expectedUrl: string;
    statusCode: number;
    head: any;
    response: any;
    waitForPayload?: boolean;
    responseDelay?: number;
}

/**
 * Build telemetry test plan
 *
 * Concerns to test:
 * options: local, remote, clean, debug, release, device, emulator, target
 * platforms: android, ios, windows, wp8
 *   + multiple platforms in a single command
 *   + no platforms specified in the command line, so we choose what to build
 *   + specifying contradictory options in the command line (e.g.: --debug --release) --> The command fails, so we don't need to test this
 * remote build: project"s size, gziped project"s size, changed files" count, was incremental build, secure HTTPs server?
 * Unexpected behavior: --uknown_option and unknown_platform
 *
 * Test cases:
 * 1. android local clean release emulator
 * 2. ios remote debug device target secure_server incremental --> We are not testing secure_server currently
 * 3. android ios unsecure_server not_incremental
 * 4. no command line, implicit windows wp8
 * 5. --uknown_option unknown_platform
 *
 * TODO: We currently aren't testing a secure server, because we need to find a good way of either
 *       installing the client certificate in both Windows and Mac, or mocking the certificate path
 */

module BuildAndRunTelemetryTests {
    export function createBuildAndRunTelemetryTests(runCommand: { (args: string[]): Q.Promise<TacoUtility.ICommandTelemetryProperties> },
        getTestHttpServer: { (): http.Server }, isBuild: boolean): void {
        var tacoHome = path.join(os.tmpdir(), "taco-cli", isBuild ? "build" : "run");
        var projectPath = path.join(tacoHome, "example");
        var testHttpServer: http.Server;

        var cordova: Cordova.ICordova = new mockCordova.MockCordova510();
        var vcordova: string = "4.0.0";
        var remoteServerConfiguration = { host: "localhost", port: 3000, secure: false, mountPoint: "cordova" };

        var customLoader: TacoUtility.ITacoPackageLoader = {
            lazyRequire: (packageName: string, packageId: string, logLevel?: TacoUtility.InstallLogLevel) => {
                return Q(cordova);
            }
        };

        before(() => {
            testHttpServer = getTestHttpServer();
        });

        // We mock cordova build
        cordova.raw.build = function (options: Cordova.ICordovaRawOptions): Q.Promise<any> {
            return Q({});
        };

        // We mock cordova run
        cordova.raw.run = function (options: Cordova.ICordovaRawOptions): Q.Promise<any> {
            return Q({});
        };

        function generateCompleteBuildSequence(platform: string, shouldSupportIncrementalBuild: boolean,
            shouldSupportDownloadSequence: boolean, options?: string): any {
            var configuration = "debug";
            var buildNumber = 12341;
        
            // Mock out the server on the other side
            var queryOptions: { [key: string]: string } = {
                command: "build",
                vcordova: vcordova,
                vcli: require(path.join(__dirname, "..", "package.json")).version,
                cfg: configuration,
                platform: platform
            };
            if (options) {
                queryOptions["options"] = options;
            }

            var zip = new AdmZip();
            zip.addFile("test.txt", new Buffer("test file"), "comment");
            var zippedAppBuffer = zip.toBuffer();

            var nonIncrementalBuildStart: IExpectedRequest[] = [{
                    expectedUrl: "/cordova/build/tasks?" + querystring.stringify(queryOptions),
                    head: {
                        "Content-Type": "application/json",
                        "Content-Location": "http://localhost:3000/cordova/build/tasks/" + buildNumber
                    },
                    statusCode: 202,
                    response: JSON.stringify(new BuildInfo({ status: BuildInfo.UPLOADING, buildNumber: buildNumber })),
                    waitForPayload: true
                }];

            queryOptions["buildNumber"] = "12340";
            var incrementalBuildStart: IExpectedRequest[] = [{
                    expectedUrl: "/cordova/build/12340",
                    head: { "Content-Type": "application/json" },
                    statusCode: 200,
                    response: "",
                    waitForPayload: false
                },
                {
                    expectedUrl: "/cordova/build/tasks?" + querystring.stringify(queryOptions),
                    head: {
                        "Content-Type": "application/json",
                        "Content-Location": "http://localhost:3000/cordova/build/tasks/" + buildNumber
                    },
                    statusCode: 202,
                    response: JSON.stringify(new BuildInfo({ status: BuildInfo.COMPLETE, buildNumber: buildNumber })),
                    waitForPayload: true
                }];

            var remainingBuildSequence: IExpectedRequest[] = [{
                    expectedUrl: "/cordova/build/tasks/" + buildNumber,
                    head: { "Content-Type": "application/json" },
                    statusCode: 200,
                    response: JSON.stringify(new BuildInfo({ status: BuildInfo.UPLOADED, buildNumber: buildNumber })),
                    waitForPayload: false
                },
                {
                    expectedUrl: "/cordova/build/tasks/" + buildNumber + "/log?offset=0",
                    head: { "Content-Type": "application/json" },
                    statusCode: 200,
                    response: "1",
                    waitForPayload: false
                },
                {
                    expectedUrl: "/cordova/build/tasks/" + buildNumber,
                    head: { "Content-Type": "application/json" },
                    statusCode: 200,
                    response: JSON.stringify(new BuildInfo({ status: BuildInfo.COMPLETE, buildNumber: buildNumber })),
                    waitForPayload: false
                },
                {
                    expectedUrl: "/cordova/build/tasks/" + buildNumber + "/log?offset=1",
                    head: { "Content-Type": "application/json" },
                    statusCode: 200,
                    response: "2",
                    waitForPayload: false
                },
                {
                    expectedUrl: util.format("/cordova/files/%d/cordovaApp/plugins/%s.json", buildNumber, platform),
                    head: { "Content-Type": "application/json" },
                    statusCode: 200,
                    response: JSON.stringify({}),
                    waitForPayload: false
                }
            ];

            var downloadSequence = [{
                    expectedUrl: util.format("/cordova/build/%d/download", buildNumber),
                    head: { "Content-Type": "application/zip", "Content-disposition": "attachment; filename=app.zip" },
                    statusCode: 200,
                    response: zippedAppBuffer,
                    waitForPayload: false
                }];

            var buildSequence = (shouldSupportIncrementalBuild ? incrementalBuildStart : nonIncrementalBuildStart).concat(remainingBuildSequence);
            if (shouldSupportDownloadSequence) {
                buildSequence = buildSequence.concat(downloadSequence);
            }

            return buildSequence;
        }

        function configureRemoteServer(done: MochaDone, shouldSupportAndroid: boolean, shouldSupportIncrementalBuild: boolean,
            shouldSupportDownloadSequence: boolean, options?: string): Q.Promise<any> {
            var sequence = generateCompleteBuildSequence("ios", shouldSupportIncrementalBuild, shouldSupportDownloadSequence, options);
            if (shouldSupportAndroid) {
                var androidSequence = generateCompleteBuildSequence("android", shouldSupportIncrementalBuild,
                    shouldSupportDownloadSequence, options);
                sequence = androidSequence.concat(sequence);
            }

            var serverFunction = ServerMock.generateServerFunction(done, sequence);
            testHttpServer.on("request", serverFunction);

            var platforms: { [platform: string]: Settings.IRemoteConnectionInfo } = { ios: remoteServerConfiguration };
            if (shouldSupportAndroid) {
                platforms["android"] = remoteServerConfiguration;
            }

            return Settings.saveSettings({ remotePlatforms: platforms });
        }

        var expectedGzipedSizeAbsoluteError = 20;

        // We use this function to validate that the gzip size is near the expected ratio (non-deterministic changes in dates or other 
        // numbers might change the compression ratio, so it's difficult to predict the exact size), and then replace the number with
        // the expected size, so we can compare it by eql with the expected full telemetry properties
        function validateGzipedSize(telemetryProperties: TacoUtility.ICommandTelemetryProperties, platform: string, expectedGzippedSize: number): void {
            var keyName = "remotebuild." + platform + ".gzipedProjectSizeInBytes";
            if (expectedGzippedSize !== -1) {
                var value = telemetryProperties[keyName].value;
                value.should.be.above(expectedGzipedSizeAbsoluteError - expectedGzippedSize);
                value.should.be.below(expectedGzipedSizeAbsoluteError + expectedGzippedSize);
                telemetryProperties[keyName].value = expectedGzippedSize;
            } else {
                (typeof telemetryProperties[keyName] === "undefined").should.be.true;
            }
        }

        function telemetryShouldEqual(telemetryProperties: TacoUtility.ICommandTelemetryProperties,
            expected: any, iosExpectedGzipedSize: number = -1, androidGzipSize: number = -1): void {
            (typeof telemetryProperties === "undefined").should.be.false;
            validateGzipedSize(telemetryProperties, "ios", iosExpectedGzipedSize);
            validateGzipedSize(telemetryProperties, "android", androidGzipSize);
            telemetryProperties.should.eql(expected); // We are comparing the objects, after overriding the sizes with the expected values
        }

        beforeEach((done: MochaDone) => {
            // Warning: After this line, all cordova CLI commands will have to be mocked
            TacoUtility.TacoPackageLoader.MockForTests = customLoader;

            Settings.saveSettings({ remotePlatforms: {} })
                .done(() => done(), done);
        });

        afterEach(() => {
            TacoUtility.TacoPackageLoader.MockForTests = null;
        });

        it("1. android local clean release emulator", (done: MochaDone) => {
            var args = ["--local", "--release", "--emulator", "android"];

            var expected: TacoUtility.ICommandTelemetryProperties = {
                "options.local": { isPii: false, value: true },
                "options.release": { isPii: false, value: true },
                "options.emulator": { isPii: false, value: true },
                "platforms.requestedViaCommandLine.local1": { isPii: false, value: "android" },
                subCommand: { isPii: false, value: "build" }
            };

            if (isBuild) { // Run doesn't support clean, and local run doesn't report the actuallyBuilt platforms
                args.unshift("--clean");
                expected["options.clean"] = { isPii: false, value: true };
                expected["platforms.actuallyBuilt.local1"] = { isPii: false, value: "android" };
            }

            runCommand(args).done(telemetryProperties => {
                telemetryShouldEqual(telemetryProperties, expected);
                done();
            });
        });

        it("2. ios remote debug device target non_secure_server incremental", (done: MochaDone) => {
            var args = ["--remote", "--debug", "--device", "--target=my_device", "ios"];

            var expected = {
                "options.remote": { isPii: false, value: true },
                "options.debug": { isPii: false, value: true },
                "options.device": { isPii: false, value: true },
                "options.target": { isPii: false, value: "my_device" },
                "platforms.actuallyBuilt.remote1": { isPii: false, value: "ios" },
                "platforms.requestedViaCommandLine.remote1": { isPii: false, value: "ios" },
                subCommand: { isPii: false, value: "build" },
                "platforms.remote.ios.is_secure": { isPii: false, value: false },
                "remoteBuild.ios.filesChangedCount": { isPii: false, value: 8 },
                "remoteBuild.ios.wasIncremental": { isPii: false, value: true },
                "remotebuild.ios.gzipedProjectSizeInBytes": { isPii: false, value: 28382 },
                "remotebuild.ios.projectSizeInBytes": { isPii: false, value: 48128 }
            };

            // We write an empty changes file, and a builf info file so we'll get an incremental build
            var changeTimeFileDirectory = path.join(projectPath, "remote", "ios", "debug");
            utils.createDirectoryIfNecessary(changeTimeFileDirectory);
            var changeTimeFile = path.join(changeTimeFileDirectory, "lastChangeTime.json");
            var buildInfoFile = path.join(changeTimeFileDirectory, "buildInfo.json");
            fs.writeFileSync(changeTimeFile, "{}");
            fs.writeFileSync(buildInfoFile, "{\"buildNumber\": 12340}");
            configureRemoteServer(done, false, true, true, "--device")
                .then(() => runCommand(args))
                .finally(() => testHttpServer.removeAllListeners("request"))
                .done(telemetryProperties => {
                    telemetryShouldEqual(telemetryProperties, expected, 28382);
                    done();
                });
        });

        it("3. android ios unsecure_server not_incremental", (done: MochaDone) => {
            var args = ["android", "ios"];
            var expected = {
                "platforms.actuallyBuilt.remote1": { isPii: false, value: "android" },
                "platforms.actuallyBuilt.remote2": { isPii: false, value: "ios" },
                "platforms.requestedViaCommandLine.remote1": { isPii: false, value: "android" },
                "platforms.requestedViaCommandLine.remote2": { isPii: false, value: "ios" },
                subCommand: { isPii: false, value: "build" },
                "platforms.remote.android.is_secure": { isPii: false, value: false },
                "platforms.remote.ios.is_secure": { isPii: false, value: false },
                "remoteBuild.android.filesChangedCount": { isPii: false, value: 8 },
                "remoteBuild.android.wasIncremental": { isPii: false, value: false },
                "remotebuild.android.gzipedProjectSizeInBytes": { isPii: false, value: 28379 },
                "remotebuild.android.projectSizeInBytes": { isPii: false, value: 48128 },
                "remoteBuild.ios.filesChangedCount": { isPii: false, value: 9 },
                "remoteBuild.ios.wasIncremental": { isPii: false, value: false },
                "remotebuild.ios.gzipedProjectSizeInBytes": { isPii: false, value: 28427 },
                "remotebuild.ios.projectSizeInBytes": { isPii: false, value: 49152 }
            };

            configureRemoteServer(done, true, false, false, null)
                .then(() => runCommand(args))
                .done(telemetryProperties => {
                    telemetryShouldEqual(telemetryProperties, expected, 28427, 28379);
                    done();
                });
        });

        it("4. no command line, implicit windows wp8", (done: MochaDone) => {
            // taco platform add windows wp8: We mock adding the platform
            utils.createDirectoryIfNecessary(path.join(projectPath, "platforms", "windows"));
            utils.createDirectoryIfNecessary(path.join(projectPath, "platforms", "wp8"));

            var args: string[] = [];
            var expected = {
                "platforms.actuallyBuilt.local1": { isPii: false, value: "windows" },
                "platforms.actuallyBuilt.local2": { isPii: false, value: "wp8" },
                subCommand: { isPii: false, value: "build" }
            };

            runCommand(args).done(telemetryProperties => {
                telemetryShouldEqual(telemetryProperties, expected);
                done();
            });
        });

        it("5. --uknown_option unknown_platform", (done: MochaDone) => {
            var args = ["--uknown_option=unknown_value", "unknown_platform"];
            var expected = {
                "platforms.actuallyBuilt.local1": { isPii: true, value: "unknown_platform" },
                "platforms.requestedViaCommandLine.local1": { isPii: true, value: "unknown_platform" },
                subCommand: { isPii: false, value: "build" },
                "unknown_option1.name": { isPii: true, value: "uknown_option" },
                "unknown_option1.value": { isPii: true, value: "unknown_value" }
            };

            runCommand(args).done(telemetryProperties => {
                telemetryShouldEqual(telemetryProperties, expected);
                done();
            });
        });
    }
}

export = BuildAndRunTelemetryTests;
