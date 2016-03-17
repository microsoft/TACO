// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/// <reference path="../../typings/mocha.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/should.d.ts" />
/// <reference path="../../typings/cordovaExtensions.d.ts" />
/// <reference path="../../typings/del.d.ts" />
"use strict";

/* tslint:disable:no-var-requires */
// var require needed for should module to work correctly
// Note not import: We don't want to refer to shouldModule, but we need the require to occur since it modifies the prototype of Object.
var shouldModule: any = require("should");
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
import IHttpServerFunction = require ("./utils/httpServerFunction");
import kitHelper = require ("../cli/utils/kitHelper");
import IRemoteServerSequence = require ("./utils/remoteServerSequence");
import resources = require ("../resources/resourceManager");
import ServerMock = require ("./utils/serverMock");
import RemoteMock = require ("./utils/remoteMock");
import TacoUtility = require ("taco-utils");

import BuildInfo = TacoUtility.BuildInfo;
import Command = buildAndRunTelemetry.Command;
import utils = TacoUtility.UtilHelper;

import CommandHelper = require ("./utils/commandHelper");
import ICommand = TacoUtility.Commands.ICommand;

var create: ICommand = CommandHelper.getCommand("create");

describe("taco run", function (): void {
    var testHttpServer: http.Server;
    var tacoHome: string = path.join(os.tmpdir(), "taco-cli", "run");
    var originalCwd: string;
    var vcordova: string = "4.0.0";

    function createCleanProject(): Q.Promise<any> {
        // Create a dummy test project with no platforms added
        utils.createDirectoryIfNecessary(tacoHome);
        process.chdir(tacoHome);
        return Q.denodeify(del)("example").then(function (): Q.Promise<any> {
            var args: string[] = ["example", "--cordova", vcordova];
            return create.run(args);
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
        var port: number = 3000;
        testHttpServer.listen(port);
        // Configure a dummy platform "test" to use the mocked out remote server in insecure mode
        RemoteMock.saveConfig("test", { host: "localhost", port: 3000, secure: false, mountPoint: "cordova" }).done(function (): void {
            mocha();
        }, function (err: any): void {
            mocha(err);
        });
    });

    after(function (done: MochaDone): void {
        process.chdir(originalCwd);
        kitHelper.kitPackagePromise = null;
        testHttpServer.close();
        rimraf(tacoHome, function (err: Error): void { done(); }); // ignore errors
    });

    beforeEach(function (mocha: MochaDone): void {
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

    var runRun: (args: string[]) => Q.Promise<TacoUtility.ICommandTelemetryProperties> = function (args: string[]): Q.Promise<TacoUtility.ICommandTelemetryProperties> {
        var run: ICommand = CommandHelper.getCommand("run");
        return run.run(args);
    };

    it("should make the correct sequence of calls for 'taco run --remote test --device'", function (mocha: MochaDone): void {
        var runArguments: string[] = ["--remote", "test", "--device", "--nobuild"];
        var configuration: string = "debug";
        var buildNumber: number = 12343;

        var buildInfo = {
            buildNumber: buildNumber,
            status: BuildInfo.COMPLETE,
            buildLang: "en"
        };

        var buildInfoPath: string = path.resolve(".", "remote", "test", configuration);
        utils.createDirectoryIfNecessary(buildInfoPath);
        fs.writeFileSync(path.join(buildInfoPath, "buildInfo.json"), JSON.stringify(buildInfo));

        // Mock out the server on the other side
        var sequence: IRemoteServerSequence[] = [
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
        var serverFunction: IHttpServerFunction = ServerMock.generateServerFunction(mocha, sequence);
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
        var target: string = "iphone 5";
        var runArguments: string[] = ["--remote", "test", "--emulator", "--target", target, "--nobuild"];
        var configuration: string = "debug";
        var buildNumber: number = 12344;

        var buildInfo = {
            buildNumber: buildNumber,
            status: BuildInfo.COMPLETE,
            buildLang: "en"
        };

        var buildInfoPath: string = path.resolve(".", "remote", "test", configuration);
        utils.createDirectoryIfNecessary(buildInfoPath);
        fs.writeFileSync(path.join(buildInfoPath, "buildInfo.json"), JSON.stringify(buildInfo));

        // Mock out the server on the other side
        var sequence: IRemoteServerSequence[] = [
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

        var serverFunction: IHttpServerFunction = ServerMock.generateServerFunction(mocha, sequence);
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
