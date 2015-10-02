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

/* tslint:disable:no-var-requires */
// var require needed for should module to work correctly
// Note not import: We don't want to refer to shouldModule, but we need the require to occur since it modifies the prototype of Object.
var shouldModule = require("should");
/* tslint:enable:no-var-requires */

import del = require ("del");
import fs = require ("fs");
import http = require ("http");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import querystring = require ("querystring");
import rimraf = require ("rimraf");

import buildAndRunTelemetry = require ("./buildAndRunTelemetry");
import createMod = require ("../cli/create");
import kitHelper = require ("../cli/utils/kitHelper");
import resources = require ("../resources/resourceManager");
import runMod = require ("../cli/run");
import ServerMock = require ("./utils/serverMock");
import RemoteMock = require ("./utils/remoteMock");
import TacoUtility = require ("taco-utils");

import BuildInfo = TacoUtility.BuildInfo;
import Command = buildAndRunTelemetry.Command;
import utils = TacoUtility.UtilHelper;

var create = new createMod();

describe("taco run", function (): void {
    this.timeout(20000); // The remote tests sometimes take some time to run
    var testHttpServer: http.Server;
    var tacoHome = path.join(os.tmpdir(), "taco-cli", "run");
    var originalCwd: string;
    var vcordova = "4.0.0";

    function createCleanProject(): Q.Promise<any> {
        // Create a dummy test project with no platforms added
        utils.createDirectoryIfNecessary(tacoHome);
        process.chdir(tacoHome);
        return Q.denodeify(del)("example").then(function (): Q.Promise<any> {
            var args = ["example", "--cordova", vcordova];
            return create.run({
                options: {},
                original: args,
                remain: args
            });
        })
            .then(function (): void {
            process.chdir(path.join(tacoHome, "example"));
        });
    }

    before(function (mocha: MochaDone): void {
        originalCwd = process.cwd();
        // Set up mocked out resources
        process.env["TACO_UNIT_TEST"] = true;
        // Use a dummy home location so we don't trash any real configurations
        process.env["TACO_HOME"] = tacoHome;
        // Force KitHelper to fetch the package fresh
        kitHelper.kitPackagePromise = null;
        // Create a mocked out remote server so we can specify how it reacts
        testHttpServer = http.createServer();
        var port = 3000;
        testHttpServer.listen(port);
        // Configure a dummy platform "test" to use the mocked out remote server in insecure mode
        RemoteMock.saveConfig("test", { host: "localhost", port: 3000, secure: false, mountPoint: "cordova" }).done(function (): void {
            mocha();
        }, function (err: any): void {
            mocha(err);
        });
    });

    after(function (done: MochaDone): void {
        this.timeout(30000);
        process.chdir(originalCwd);
        kitHelper.kitPackagePromise = null;
        testHttpServer.close();
        rimraf(tacoHome, function (err: Error): void { done(); }); // ignore errors
    });

    beforeEach(function (mocha: MochaDone): void {
        this.timeout(50000);
        Q.fcall(createCleanProject).done(function (): void {
            mocha();
        }, function (err: any): void {
            mocha(err);
        });
    });

    afterEach(function (mocha: MochaDone): void {
        process.chdir(tacoHome);
        del("example", mocha);
    });

    var runRun = function (args: string[]): Q.Promise<TacoUtility.ICommandTelemetryProperties> {
        var run = new runMod();
        return run.run({
            options: {},
            original: args,
            remain: args
        });
    };

    it("should make the correct sequence of calls for 'taco run --remote test --device'", function (mocha: MochaDone): void {
        var runArguments = ["--remote", "test", "--device", "--nobuild"];
        var configuration = "debug";
        var buildNumber = 12343;

        var buildInfo = {
            buildNumber: buildNumber,
            status: BuildInfo.COMPLETE,
            buildLang: "en"
        };

        var buildInfoPath = path.resolve(".", "remote", "test", configuration);
        utils.createDirectoryIfNecessary(buildInfoPath);
        fs.writeFileSync(path.join(buildInfoPath, "buildInfo.json"), JSON.stringify(buildInfo));

        // Mock out the server on the other side
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
                expectedUrl: "/cordova/build/" + buildNumber + "/deploy",
                head: {
                    "Content-Type": "application/json"
                },
                statusCode: 200,
                response: JSON.stringify(new BuildInfo({
                    status: BuildInfo.INSTALLED,
                    buildNumber: buildNumber
                })),
                waitForPayload: false
            },
            {
                expectedUrl: "/cordova/build/" + buildNumber + "/run",
                head: {
                    "Content-Type": "application/json"
                },
                statusCode: 200,
                response: JSON.stringify(new BuildInfo({
                    status: BuildInfo.RUNNING,
                    buildNumber: buildNumber
                })),
                waitForPayload: false
            }
        ];
        var serverFunction = ServerMock.generateServerFunction(mocha, sequence);
        testHttpServer.on("request", serverFunction);

        Q(runArguments).then(runRun).finally(function (): void {
            testHttpServer.removeListener("request", serverFunction);
        }).done(function (): void {
            mocha();
        }, function (err: any): void {
                mocha(err);
            });
    });

    it("should make the correct sequence of calls for 'taco run --remote test --emulator", function (mocha: MochaDone): void {
        var target = "iphone 5";
        var runArguments = ["--remote", "test", "--emulator", "--target", target, "--nobuild"];
        var configuration = "debug";
        var buildNumber = 12344;

        var buildInfo = {
            buildNumber: buildNumber,
            status: BuildInfo.COMPLETE,
            buildLang: "en"
        };

        var buildInfoPath = path.resolve(".", "remote", "test", configuration);
        utils.createDirectoryIfNecessary(buildInfoPath);
        fs.writeFileSync(path.join(buildInfoPath, "buildInfo.json"), JSON.stringify(buildInfo));

        // Mock out the server on the other side
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
                expectedUrl: "/cordova/build/" + buildNumber + "/emulate?" + querystring.stringify({ target: target }),
                head: {
                    "Content-Type": "application/json"
                },
                statusCode: 200,
                response: JSON.stringify(new BuildInfo({
                    status: BuildInfo.EMULATED,
                    buildNumber: buildNumber
                })),
                waitForPayload: false
            }
        ];

        var serverFunction = ServerMock.generateServerFunction(mocha, sequence);
        testHttpServer.on("request", serverFunction);

        Q(runArguments).then(runRun).finally(function (): void {
            testHttpServer.removeListener("request", serverFunction);
        }).done(function (): void {
            mocha();
        }, function (err: any): void {
            mocha(err);
            });
    });

    it("should error out if there is no buildInfo.json and we require no build", function (mocha: MochaDone): void {
        Q(["--remote", "--nobuild", "test"]).then(runRun).done(function (): void {
            mocha(new Error("Run should have failed!"));
        }, function (err: any): void {
            if (err.message !== "NoRemoteBuildIdFound") {
                mocha(err);
            } else {
                mocha();
            }
        });
    });

    describe("telemetry", () => {
        buildAndRunTelemetry.createBuildAndRunTelemetryTests.call(this, runRun, Command.Run);
    });
});
