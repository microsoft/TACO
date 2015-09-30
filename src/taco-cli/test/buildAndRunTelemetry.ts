/**
 ********************************************************
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
var should = require("should"); // Note not import: We don't want to refer to should_module, but we need the require to occur since it modifies the prototype of Object.

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
 * Build/Run telemetry test plan
 *
 * Concerns to test:
 * options: local, remote, clean, debug, release, device, emulator, target
 * platforms: android, ios, windows, wp8
 *   + multiple platforms in a single command
 *   + no platforms specified in the command line, so we choose what to build
 *   + specifying contradictory options in the command line (e.g.: --debug --release) --> The command fails, so we don't need to test this
 * remote build: project"s size, gziped project"s size, changed files" count, was incremental build, secure HTTPs server?
 * Unexpected behavior: --uknown_option and unknown_platform
 * Run specific options: nobuild, debuginfo
 *
 * Test cases:
 * 1. android local clean release emulator
 * 2. ios remote debug target secure_server incremental --> We are not testing secure_server currently
 * 3. android ios unsecure_server not_incremental
 * 4. no command line platforms, implicit windows wp8 device
 * 5. --uknown_option unknown_platform
 * 6. nobuild debuginfo (Only for Run)
 *
 * TODO: We currently aren't testing a secure server, because we need to find a good way of either
 *       installing the client certificate in both Windows and Mac, or mocking the certificate path
 */

module BuildAndRunTelemetryTests {
    export enum Command {
        Build,
        Run,
        Emulate
    }

    export function createBuildAndRunTelemetryTests(runCommand: { (args: string[]): Q.Promise<TacoUtility.ICommandTelemetryProperties> }, command: Command): void {
        var tacoHome = path.join(os.tmpdir(), "taco-cli", commandSwitch("build", "run", "emulate"));
        var projectPath = path.join(tacoHome, "example");
        var testIosHttpServer: http.Server;
        var testAndroidHttpServer: http.Server;
        var iosPort = 3001;
        var androidPort = 3002;

        var cordova: Cordova.ICordova = mockCordova.MockCordova510.default;
        var vcordova: string = "4.0.0";
        var buildNumber = 12341;
        var isNotEmulate = command !== Command.Emulate;

        var customLoader: TacoUtility.ITacoPackageLoader = {
            lazyRequire: (packageName: string, packageId: string, logLevel?: TacoUtility.InstallLogLevel) => {
                return Q(cordova);
            }
        };

        before(() => {
            testIosHttpServer = http.createServer();
            testIosHttpServer.listen(iosPort);
            testAndroidHttpServer = http.createServer();
            testAndroidHttpServer.listen(androidPort);
        });

        after(() => {
            testIosHttpServer.close();
            testAndroidHttpServer.close();
        });

        // We mock cordova build
        cordova.raw.build = function (options: Cordova.ICordovaRawOptions): Q.Promise<any> {
            return Q({});
        };

        // We mock cordova run
        cordova.raw.run = function (options: Cordova.ICordovaRawOptions): Q.Promise<any> {
            return Q({});
        };

        // We mock cordova emulate
        cordova.raw.emulate = function (options: Cordova.ICordovaRawOptions): Q.Promise<any> {
            return Q({});
        };

        function generateCompleteBuildSequence(platform: string, port: number, isIncrementalTest: boolean): any {
            var configuration = "debug";

            // Mock out the server on the other side
            var queryOptions: { [key: string]: string } = {
                command: "build",
                vcordova: vcordova,
                vcli: require(path.join(__dirname, "..", "package.json")).version,
                cfg: configuration,
                platform: platform
            };

            var zip = new AdmZip();
            zip.addFile("test.txt", new Buffer("test file"), "comment");
            var zippedAppBuffer = zip.toBuffer();

            var nonIncrementalBuildStart: IExpectedRequest[] = [{
                expectedUrl: "/cordova/build/tasks?" + querystring.stringify(queryOptions),
                head: {
                    "Content-Type": "application/json",
                    "Content-Location": "http://localhost:" + port + "/cordova/build/tasks/" + buildNumber
                },
                statusCode: 202,
                response: JSON.stringify(new BuildInfo({ status: BuildInfo.UPLOADING, buildNumber: buildNumber, buildLang: "en" })),
                waitForPayload: true
            }];

            queryOptions["buildNumber"] = "" + buildNumber;
            var incrementalBuildStart: IExpectedRequest[] = [{
                    expectedUrl: "/cordova/build/" + buildNumber,
                    head: { "Content-Type": "application/json" },
                    statusCode: 200,
                    response: JSON.stringify(new BuildInfo({ status: BuildInfo.COMPLETE, buildNumber: buildNumber, buildLang: "en" })),
                    waitForPayload: false
                },
                {
                    expectedUrl: "/cordova/build/tasks?" + querystring.stringify(queryOptions),
                    head: {
                        "Content-Type": "application/json",
                        "Content-Location": "http://localhost:" + port + "/cordova/build/tasks/" + buildNumber
                    },
                    statusCode: 202,
                    response: JSON.stringify(new BuildInfo({ status: BuildInfo.UPLOADING, buildNumber: buildNumber, buildLang: "en" })),
                    waitForPayload: true
                }];

            var remainingBuildSequence: IExpectedRequest[] = [{
                expectedUrl: "/cordova/build/tasks/" + buildNumber,
                head: { "Content-Type": "application/json" },
                statusCode: 200,
                response: JSON.stringify(new BuildInfo({ status: BuildInfo.UPLOADED, buildNumber: buildNumber, buildLang: "en" })),
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
                    expectedUrl: "/cordova/build/tasks",
                    head: {
                        "Content-Type": "application/json"
                    },
                    statusCode: 200,
                    response: JSON.stringify({ queued: 0, queuedBuilds: [] }),
                    waitForPayload: false
                },
                {
                    expectedUrl: "/cordova/build/tasks/" + buildNumber,
                    head: { "Content-Type": "application/json" },
                    statusCode: 200,
                    response: JSON.stringify(new BuildInfo({ status: BuildInfo.COMPLETE, buildNumber: buildNumber, buildLang: "en" })),
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

            var buildSequence = (isIncrementalTest ? incrementalBuildStart : nonIncrementalBuildStart).concat(remainingBuildSequence);

            if (command !== Command.Build) {
                var target = isIncrementalTest ? "ipad 2" : "";
                var runSequence = [{
                    expectedUrl: "/cordova/build/" + buildNumber + "/emulate?" + querystring.stringify({ target: target }),
                    head: { "Content-Type": "application/json" },
                    statusCode: 200,
                    response: JSON.stringify(new BuildInfo({ status: BuildInfo.EMULATED, buildNumber: buildNumber })),
                    waitForPayload: false
                }];
                buildSequence = buildSequence.concat(runSequence);
            }

            return buildSequence;
        }

        function configureRemoteServer(done: MochaDone, isIncrementalTest: boolean): Q.Promise<any> {
            var iosSequence = generateCompleteBuildSequence("ios", iosPort, isIncrementalTest);
            var androidSequence = generateCompleteBuildSequence("android", androidPort, isIncrementalTest);

            var iosServerFunction = ServerMock.generateServerFunction(done, iosSequence);
            var androidServerFunction = ServerMock.generateServerFunction(done, androidSequence);
            testIosHttpServer.on("request", iosServerFunction);

            if (!isIncrementalTest) {
                testAndroidHttpServer.on("request", androidServerFunction);
            }

            var platforms: { [platform: string]: Settings.IRemoteConnectionInfo } = { ios: { host: "localhost", port: iosPort, secure: false, mountPoint: "cordova" } };
            if (!isIncrementalTest) {
                platforms["android"] = { host: "localhost", port: androidPort, secure: false, mountPoint: "cordova" };
            }

            return Settings.saveSettings({ remotePlatforms: platforms });
        }

        var expectedGzipedSizeAbsoluteError = 60; /* This is how much the gzip size changes because of the different 
                                                     compression rate of different file modification dates, etc... */

        // We use this function to validate that the gzip size is near the expected ratio (non-deterministic changes in dates or other 
        // numbers might change the compression ratio, so it's difficult to predict the exact size), and then replace the number with
        // the expected size, so we can compare it by eql with the expected full telemetry properties
        function validateGzipedSize(telemetryProperties: TacoUtility.ICommandTelemetryProperties, platform: string, expectedGzippedSize: number): void {
            var keyName = "remotebuild." + platform + ".gzipedProjectSizeInBytes";
            if (expectedGzippedSize !== -1) {
                var value = telemetryProperties[keyName].value;
                value.should.be.above(expectedGzipedSizeAbsoluteError - expectedGzippedSize);
                value.should.be.below(expectedGzipedSizeAbsoluteError + expectedGzippedSize);
                telemetryProperties[keyName].value = String(expectedGzippedSize);
            } else {
                (typeof telemetryProperties[keyName] === "undefined").should.be.equal(true);
            }
        }

        function telemetryShouldEqual(telemetryProperties: TacoUtility.ICommandTelemetryProperties,
            expected: any, iosExpectedGzipedSize: number = -1, androidGzipSize: number = -1): void {
            (typeof telemetryProperties === "undefined").should.be.equal(false);
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

        function commandSwitch<T>(buildResult: T, runResult: T, emulateResult: T): T {
            switch (command) {
                case Command.Build:
                    return buildResult;
                case Command.Run:
                    return runResult;
                case Command.Emulate:
                    return emulateResult;
                default:
                    throw new Error("Unknown command");
            }
        }

        it("1. android local clean release emulator", (done: MochaDone) => {
            var args = ["--local", "--release", "android"];

            var expected: TacoUtility.ICommandTelemetryProperties = {
                "options.local": { isPii: false, value: "true" },
                "options.release": { isPii: false, value: "true" },
                "platforms.requestedViaCommandLine.local1": { isPii: false, value: "android" },
                subCommand: { isPii: false, value: commandSwitch("build", "local", "emulate") }
            };

            if ((command === Command.Build)) {
                args.unshift("--clean"); // Only build supports clean
                expected["options.clean"] = { isPii: false, value: "true" };
            } else if (command !== Command.Emulate) {
                args.unshift("--emulator"); // Emulator doesn't support emulator
                expected["options.emulator"] = { isPii: false, value: "true" };
            }

            if (command !== Command.Run) { // Local run doesn't report the actuallyBuilt platforms
                expected["platforms.actuallyBuilt.local1"] = { isPii: false, value: "android" };
            }

            runCommand(args).then(telemetryProperties => {
                telemetryShouldEqual(telemetryProperties, expected);
            }).done(() => done(), done);
        });

        function mockProjectWithIncrementalBuild(): void {
            // We write an empty changes file, and a build info file so we'll get an incremental build
            var changeTimeFileDirectory = path.join(projectPath, "remote", "ios", "debug");
            utils.createDirectoryIfNecessary(changeTimeFileDirectory);
            var changeTimeFile = path.join(changeTimeFileDirectory, "lastChangeTime.json");
            var buildInfoFile = path.join(changeTimeFileDirectory, "buildInfo.json");
            fs.writeFileSync(changeTimeFile, "{}");
            fs.writeFileSync(buildInfoFile, "{\"buildNumber\": " + buildNumber + "}");
        }

        it("2. ios remote debug target non_secure_server incremental", (done: MochaDone) => {
            var args = ["--remote", "--debug", "--target=ipad 2", "ios"];

            var expected: TacoUtility.ICommandTelemetryProperties = {
                "options.remote": { isPii: false, value: "true" },
                "options.debug": { isPii: false, value: "true" },
                "options.target": { isPii: false, value: "ipad 2" },
                "platforms.actuallyBuilt.remote1": { isPii: false, value: "ios" },
                "platforms.requestedViaCommandLine.remote1": { isPii: false, value: "ios" },
                subCommand: { isPii: false, value: commandSwitch("build", "remote", "emulate") },
                "platforms.remote.ios.is_secure": { isPii: false, value: "false" },
                "remoteBuild.ios.filesChangedCount": { isPii: false, value: 8 },
                "remoteBuild.ios.wasIncremental": { isPii: false, value: "true" },
                "remotebuild.ios.gzipedProjectSizeInBytes": { isPii: false, value: "28382" },
                "remotebuild.ios.projectSizeInBytes": { isPii: false, value: "48128" }
            };

            mockProjectWithIncrementalBuild();
            configureRemoteServer(done, /* Incremental test*/ true)
                .then(() => runCommand(args))
                .finally(() => {
                    testIosHttpServer.removeAllListeners("request");
                    testAndroidHttpServer.removeAllListeners("request");
                })
                .then(telemetryProperties => {
                    telemetryShouldEqual(telemetryProperties, expected, 28382);
                }).done(() => done(), done);
        });

        it("3. android ios unsecure_server not_incremental", (done: MochaDone) => {
            var args = ["android", "ios"];
            var expected: TacoUtility.ICommandTelemetryProperties = {
                "platforms.actuallyBuilt.remote1": { isPii: false, value: "android" },
                "platforms.actuallyBuilt.remote2": { isPii: false, value: "ios" },
                "platforms.requestedViaCommandLine.remote1": { isPii: false, value: "android" },
                "platforms.requestedViaCommandLine.remote2": { isPii: false, value: "ios" },
                subCommand: { isPii: false, value: commandSwitch("build", "fallback", "emulate") },
                "platforms.remote.android.is_secure": { isPii: false, value: "false" },
                "platforms.remote.ios.is_secure": { isPii: false, value: "false" },
                "remoteBuild.android.filesChangedCount": { isPii: false, value: 8 },
                "remoteBuild.android.wasIncremental": { isPii: false, value: "false" },
                "remotebuild.android.gzipedProjectSizeInBytes": { isPii: false, value: "28379" },
                "remotebuild.android.projectSizeInBytes": { isPii: false, value: "48128" },
                "remoteBuild.ios.filesChangedCount": { isPii: false, value: 8 },
                "remoteBuild.ios.wasIncremental": { isPii: false, value: "false" },
                "remotebuild.ios.gzipedProjectSizeInBytes": { isPii: false, value: "28379" },
                "remotebuild.ios.projectSizeInBytes": { isPii: false, value: "48128" }
            };

            configureRemoteServer(done, /* Not incremental test*/ false)
                .then(() => runCommand(args))
                .finally(() => {
                    testIosHttpServer.removeAllListeners("request");
                    testAndroidHttpServer.removeAllListeners("request");
                })
                .then(telemetryProperties => telemetryShouldEqual(telemetryProperties, expected, 28379, 28379))
                .done(() => done(), done);
        });

        it("4. no command line platforms, implicit windows wp8 device", (done: MochaDone) => {
            // taco platform add windows wp8: We mock adding the platform
            utils.createDirectoryIfNecessary(path.join(projectPath, "platforms", "windows"));
            utils.createDirectoryIfNecessary(path.join(projectPath, "platforms", "wp8"));

            var expected: TacoUtility.ICommandTelemetryProperties = {
                "platforms.actuallyBuilt.local1": { isPii: false, value: "windows" },
                "platforms.actuallyBuilt.local2": { isPii: false, value: "wp8" },
                subCommand: { isPii: false, value: commandSwitch("build", "fallback", "emulate") }
            };

            var args: string[] = [];
            if (isNotEmulate) {
                args.unshift("--device");
                expected["options.device"] = { isPii: false, value: "true" };
            }

            runCommand(args)
                .then(telemetryProperties => telemetryShouldEqual(telemetryProperties, expected))
                .then(() => done(), done);
        });

        it("5. --uknown_option unknown_platform", (done: MochaDone) => {
            var args = ["--uknown_option=unknown_value", "unknown_platform"];
            var expected: TacoUtility.ICommandTelemetryProperties = {
                "platforms.requestedViaCommandLine.local1": { isPii: true, value: "unknown_platform" },
                "platforms.actuallyBuilt.local1": { isPii: true, value: "unknown_platform" },
                subCommand: { isPii: false, value: commandSwitch("build", "fallback", "emulate") },
                "unknownOption1.name": { isPii: true, value: "uknown_option" },
                "unknownOption1.value": { isPii: true, value: "unknown_value" }
            };

            runCommand(args).then(telemetryProperties => {
                telemetryShouldEqual(telemetryProperties, expected);
            }).done(() => done(), done);
        });

        if ((command !== Command.Build)) {
            it("6. nobuild debuginfo", (done: MochaDone) => {
                utils.createDirectoryIfNecessary(path.join(projectPath, "platforms", "android"));
                var args = ["--nobuild", "--debuginfo", "android"];
                var expected: TacoUtility.ICommandTelemetryProperties = {
                    "options.nobuild": { isPii: false, value: "true" },
                    "options.debuginfo": { isPii: false, value: "true" },
                    "platforms.actuallyBuilt.local1": { isPii: false, value: "android" },
                    "platforms.requestedViaCommandLine.local1": { isPii: false, value: "android" },
                    subCommand: { isPii: false, value: commandSwitch("build", "fallback", "emulate") }
                };

                runCommand(args)
                    .then(telemetryProperties => telemetryShouldEqual(telemetryProperties, expected))
                    .then(() => done(), done);
            });
        }
    }
}

export = BuildAndRunTelemetryTests;
