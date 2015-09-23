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
var should_module = require("should"); // Note not import: We don't want to refer to should_module, but we need the require to occur since it modifies the prototype of Object.

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

import buildAndRunTelemetry = require ("./buildAndRunTelemetry");
import buildMod = require ("../cli/build");
import createMod = require ("../cli/create");
import kitHelper = require ("../cli/utils/kitHelper");
import mockCordova = require ("./utils/mockCordova");
import Platform = require ("../cli/platform");
import RemoteBuildClientHelper = require ("../cli/remoteBuild/remoteBuildClientHelper");
import RemoteMock = require ("./utils/remoteMock");
import resources = require ("../resources/resourceManager");
import ServerMock = require ("./utils/serverMock");
import Settings = require ("../cli/utils/settings");
import TacoUtility = require ("taco-utils");

import BuildInfo = TacoUtility.BuildInfo;
import Command = buildAndRunTelemetry.Command;
import utils = TacoUtility.UtilHelper;

var build = new buildMod();
var create = new createMod();

describe("taco build", function (): void {
    var testHttpServer: http.Server;
    var tacoHome = path.join(os.tmpdir(), "taco-cli", "build");
    var originalCwd: string;
    var vcordova: string = "4.0.0";
    var projectPath = path.join(tacoHome, "example");

    function createCleanProject(): Q.Promise<any> {
        // Create a dummy test project with no platforms added
        utils.createDirectoryIfNecessary(tacoHome);
        process.chdir(tacoHome);
        return Q.denodeify(del)("example").then(function (): Q.Promise<any> {
            var args = ["example", "--cli", vcordova];
            return create.run({
                options: {},
                original: args,
                remain: args
            });
        }).then(function (): void {
            process.chdir(projectPath);
        });
    }

    var remoteServerConfiguration = { host: "localhost", port: 3000, secure: false, mountPoint: "cordova" };
    before(function (mocha: MochaDone): void {
        originalCwd = process.cwd();
        // Set up mocked out resources
        process.env["TACO_UNIT_TEST"] = true;
        // Use a dummy home location so we don't trash any real configurations
        process.env["TACO_HOME"] = tacoHome;
        // Force KitHelper to fetch the package fresh
        kitHelper.KitPackagePromise = null;
        // Create a mocked out remote server so we can specify how it reacts
        testHttpServer = http.createServer();
        var port = 3000;
        testHttpServer.listen(port);

        // Reduce the delay when polling for a change in status
        buildMod.RemoteBuild.PingInterval = 10;

        // Configure a dummy platform "test" to use the mocked out remote server
        RemoteMock.saveConfig("test", remoteServerConfiguration).done(() => mocha(), mocha);
    });

    after(function (done: MochaDone): void {
        this.timeout(10000);
        process.chdir(originalCwd);
        kitHelper.KitPackagePromise = null;
        testHttpServer.close();
        rimraf(tacoHome, function (err: Error): void { done(); }); // ignore errors
    });

    beforeEach(function (mocha: MochaDone): void {
        // Start each test with a pristine cordova project
        this.timeout(50000);
        Q.fcall(createCleanProject)
            .done(() => mocha(), mocha);
    });

    afterEach(function (mocha: MochaDone): void {
        // Remove the project that we operated on
        process.chdir(tacoHome);
        del("example", mocha);
    });

    var buildRun = function (args: string[]): Q.Promise<TacoUtility.ICommandTelemetryProperties> {
        var command = new buildMod();
        return command.run({
            options: {},
            original: args,
            remain: args
        });
    };

    it("should make the correct sequence of calls for 'taco build --remote test'", function (mocha: MochaDone): void {
        var buildArguments = ["--remote", "test"];
        var configuration = "debug";
        var buildNumber = 12340;
        
        // Mock out the server on the other side
        var sequence = [
            {
                expectedUrl: "/cordova/build/tasks?" + querystring.stringify({
                    command: "build",
                    vcordova: vcordova,
                    vcli: require(path.join(__dirname, "..", "package.json")).version,
                    cfg: configuration,
                    platform: "test"
                }),
                head: {
                    "Content-Type": "application/json",
                    "Content-Location": "http://localhost:3000/cordova/build/tasks/" + buildNumber
                },
                statusCode: 202,
                response: JSON.stringify(new BuildInfo({
                    status: BuildInfo.UPLOADING,
                    buildNumber: buildNumber,
                })),
                waitForPayload: true
            },
            {
                expectedUrl: "/cordova/build/tasks/" + buildNumber,
                head: {
                    "Content-Type": "application/json"
                },
                statusCode: 200,
                response: JSON.stringify(new BuildInfo({
                    status: BuildInfo.UPLOADED,
                    buildNumber: buildNumber
                })),
                waitForPayload: false
            },
            {
                expectedUrl: "/cordova/build/tasks/" + buildNumber + "/log?offset=0",
                head: {
                    "Content-Type": "application/json"
                },
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
                head: {
                    "Content-Type": "application/json"
                },
                statusCode: 200,
                response: JSON.stringify(new BuildInfo({
                    status: BuildInfo.COMPLETE,
                    buildNumber: buildNumber
                })),
                waitForPayload: false
            },
            {
                expectedUrl: "/cordova/build/tasks/" + buildNumber + "/log?offset=1",
                head: {
                    "Content-Type": "application/json"
                },
                statusCode: 200,
                response: "2",
                waitForPayload: false
            },
            {
                expectedUrl: util.format("/cordova/files/%d/cordovaApp/plugins/%s.json", buildNumber, "test"),
                head: {
                    "Content-Type": "application/json"
                },
                statusCode: 200,
                response: JSON.stringify({}),
                waitForPayload: false
            },
        ];
        var serverFunction = ServerMock.generateServerFunction(mocha, sequence);
        testHttpServer.on("request", serverFunction);

        Q(buildArguments).then(buildRun).finally(function (): void {
            testHttpServer.removeListener("request", serverFunction);
        }).done(function (): void {
            mocha();
        }, function (err: any): void {
            mocha(err);
        });
    });

    it("should report an error if the remote build fails", function (mocha: MochaDone): void {
        var buildArguments = ["--remote", "test"];
        var configuration = "debug";
        var buildNumber = 12341;
        
        // Mock out the server on the other side
        var sequence = [
            {
                expectedUrl: "/cordova/build/tasks?" + querystring.stringify({
                    command: "build",
                    vcordova: vcordova,
                    vcli: require(path.join(__dirname, "..", "package.json")).version,
                    cfg: configuration,
                    platform: "test"
                }),
                head: {
                    "Content-Type": "application/json",
                    "Content-Location": "http://localhost:3000/cordova/build/tasks/" + buildNumber
                },
                statusCode: 202,
                response: JSON.stringify(new BuildInfo({
                    status: BuildInfo.UPLOADING,
                    buildNumber: buildNumber,
                })),
                waitForPayload: true
            },
            {
                expectedUrl: "/cordova/build/tasks/" + buildNumber,
                head: {
                    "Content-Type": "application/json"
                },
                statusCode: 200,
                response: JSON.stringify(new BuildInfo({
                    status: BuildInfo.UPLOADED,
                    buildNumber: buildNumber
                }))
            },
            {
                expectedUrl: "/cordova/build/tasks/" + buildNumber + "/log?offset=0",
                head: {
                    "Content-Type": "application/json"
                },
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
                head: {
                    "Content-Type": "application/json"
                },
                statusCode: 200,
                response: JSON.stringify(new BuildInfo({
                    status: BuildInfo.ERROR,
                    buildNumber: buildNumber
                }))
            },
            {
                expectedUrl: "/cordova/build/tasks/" + buildNumber + "/log?offset=1",
                head: {
                    "Content-Type": "text/plain"
                },
                statusCode: 200,
                response: "Logfile contents"
            }
        ];

        var serverFunction = ServerMock.generateServerFunction(mocha, sequence);
        testHttpServer.on("request", serverFunction);

        Q(buildArguments).then(buildRun).finally(function (): void {
            testHttpServer.removeListener("request", serverFunction);
        }).done(function (): void {
            mocha(new Error("The build failing should result in an error"));
        }, function (err: any): void {
            mocha();
        });
    });

    it("should attempt incremental builds where possible", function (mocha: MochaDone): void {
        var buildArguments = ["--remote", "test"];
        var configuration = "debug";
        var buildNumber = 12342;

        var buildInfoDir = path.join("remote", "test", configuration);
        utils.createDirectoryIfNecessary(buildInfoDir);
        fs.writeFileSync(path.join(buildInfoDir, "buildInfo.json"), JSON.stringify(new BuildInfo({
            status: BuildInfo.COMPLETE,
            buildNumber: buildNumber
        })));
        
        // Mock out the server on the other side
        // Since this test is only whether we attempt incremental builds, we'll let the build fail to make the test shorter
        var sequence = [
            {
                expectedUrl: "/cordova/build/" + buildNumber,
                head: {
                    "Content-Type": "application/json"
                },
                statusCode: 200,
                response: JSON.stringify(new BuildInfo({
                    status: BuildInfo.COMPLETE,
                    buildNumber: buildNumber
                }))
            },
            {
                expectedUrl: "/cordova/build/tasks?" + querystring.stringify({
                    command: "build",
                    vcordova: vcordova,
                    vcli: require(path.join(__dirname, "..", "package.json")).version,
                    cfg: configuration,
                    platform: "test",
                    buildNumber: buildNumber.toString()
                }),
                head: {
                    "Content-Type": "application/json",
                    "Content-Location": "http://localhost:3000/cordova/build/tasks/" + buildNumber
                },
                statusCode: 202,
                response: JSON.stringify(new BuildInfo({
                    status: BuildInfo.UPLOADING,
                    buildNumber: buildNumber,
                })),
                waitForPayload: true
            },
            {
                expectedUrl: "/cordova/build/tasks/" + buildNumber,
                head: {
                    "Content-Type": "application/json"
                },
                statusCode: 200,
                response: JSON.stringify(new BuildInfo({
                    status: BuildInfo.ERROR,
                    buildNumber: buildNumber
                }))
            },
            {
                expectedUrl: "/cordova/build/tasks/" + buildNumber + "/log?offset=0",
                head: {
                    "Content-Type": "text/plain"
                },
                statusCode: 200,
                response: "Logfile contents"
            }
        ];

        var serverFunction = ServerMock.generateServerFunction(mocha, sequence);
        testHttpServer.on("request", serverFunction);

        Q(buildArguments).then(buildRun).finally(function (): void {
            testHttpServer.removeListener("request", serverFunction);
        }).done(function (): void {
            mocha(new Error("The build failing should result in an error"));
        }, function (err: any): void {
            mocha();
        });
    });

    describe("telemetry", () => {
        buildAndRunTelemetry.createBuildAndRunTelemetryTests.call(this, buildRun, () => testHttpServer, Command.Build);
    });
});
