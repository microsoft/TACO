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

import del = require ("del");
import fs = require ("fs");
import http = require ("http");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import rimraf = require("rimraf");
import util = require("util");
import querystring = require ("querystring");

import buildMod = require("../cli/build");
import resources = require("../resources/resourceManager");
import ServerMock = require("./utils/serverMock");
import SetupMock = require("./utils/setupMock");
import setupMod = require("../cli/setup");
import TacoUtility = require("taco-utils");

import BuildInfo = TacoUtility.BuildInfo;
import utils = TacoUtility.UtilHelper;

// TODO (Devdiv 1160579) Use dynamically acquired cordova versions
import cordova = require ("cordova");

var build = new buildMod();
var setup = new setupMod();

describe("taco build", function () {
    var testHttpServer: http.Server;
    var tacoHome = path.join(os.tmpdir(), "taco-cli", "build");

    function createCleanProject(): Q.Promise<any> {
        // Create a dummy test project with no platforms added
        utils.createDirectoryIfNecessary(tacoHome);
        process.chdir(tacoHome);
        return Q.denodeify(del)("example").then(function (): Q.Promise<any> {
            return cordova.raw.create("example");
        }).then(function (): void {
            process.chdir(path.join(tacoHome, "example"));
        });
    }

    before(function (mocha: MochaDone): void {
        // Use a dummy home location so we don't trash any real configurations
        process.env["TACO_HOME"] = tacoHome;
        process.env["TACO_UNIT_TEST"] = true;
        // Create a mocked out remote server so we can specify how it reacts
        testHttpServer = http.createServer();
        var port = 3000;
        testHttpServer.listen(port);
        // Configure a dummy platform "test" to use the mocked out remote server
        SetupMock.saveConfig("test", { host: "localhost", port: 3000, secure: false, mountPoint: "cordova" }).done(function () {
            mocha();
        }, function (err: any) {
            mocha(err);
        });

        // Reduce the delay when polling for a change in status
        buildMod.RemoteBuild.PingInterval = 10;
    });

    after(function () {
        testHttpServer.close();
        rimraf(tacoHome, function (err: Error): void {/* ignored */ }); // Not sync, and ignore errors
    });

    beforeEach(function (mocha: MochaDone): void {
        // Start each test with a pristine cordova project
        Q.fcall(createCleanProject).done(function () {
            mocha();
        }, function (err: any) {
            mocha(err);
        });
    });

    afterEach(function (mocha: MochaDone): void {
        // Remove the project that we operated on
        process.chdir(tacoHome);
        del("example", mocha);
    });

    var buildRun = function (args: string[]): Q.Promise<any> {
        return build.run({
            options: {},
            original: args,
            remain: args
        });
    };

    it("should make the correct sequence of calls for 'taco build --remote test'", function (mocha: MochaDone) {
        var buildArguments = ["--remote", "test"];
        var configuration = "debug";
        var vcordova = require("cordova/package.json").version;
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

        Q(buildArguments).then(buildRun).finally(function () {
            testHttpServer.removeListener("request", serverFunction);
        }).done(function (): void {
            mocha();
        }, function (err: any): void {
                mocha(err);
        });
    });

    it("should report an error if the remote build fails", function (mocha: MochaDone) {
        var buildArguments = ["--remote", "test"];
        var configuration = "debug";
        var vcordova = require("cordova/package.json").version;
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

        Q(buildArguments).then(buildRun).finally(function () {
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
        var vcordova = require("cordova/package.json").version;
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
                    buildNumber: buildNumber.toString() }),
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

        Q(buildArguments).then(buildRun).finally(function () {
            testHttpServer.removeListener("request", serverFunction);
        }).done(function (): void {
            mocha(new Error("The build failing should result in an error"));
        }, function (err: any): void {
                mocha();
        });
    });
});