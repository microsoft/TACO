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
/// <reference path="../../typings/cordova-extensions.d.ts" />
/// <reference path="../../typings/del.d.ts" />
"use strict";
var should_module = require("should"); // Note not import: We don't want to refer to should_module, but we need the require to occur since it modifies the prototype of Object.

import del = require ("del");
import fs = require ("fs");
import http = require ("http");
import path = require ("path");
import Q = require ("q");
import querystring = require ("querystring");
import TacoUtility = require ("taco-utils");
import utils = TacoUtility.UtilHelper;
import resources = TacoUtility.ResourcesManager;
import BuildInfo = TacoUtility.BuildInfo;

// TODO: versioning
import cordova = require ("cordova");

import runMod = require ("../cli/run");
import setupMod = require ("../cli/setup");

var run = new runMod();
var setup = new setupMod();

import ServerMock = require ("./utils/server-mock");
import SetupMock = require ("./utils/setup-mock");

describe("taco run", function (): void {
    var testHttpServer: http.Server;
    var tacoHome = path.join(__dirname, "out");

    function createCleanProject(): Q.Promise<any> {
        // Create a dummy test project with no platforms added
        utils.createDirectoryIfNecessary(tacoHome);
        process.chdir(tacoHome);
        return Q.denodeify(del)("example").then(function (): Q.Promise<any> {
            return cordova.raw.create("example");
        })
            .then(function (): void {
            process.chdir(path.join(tacoHome, "example"));
        });
    }

    before(function (mocha: MochaDone): void {
        // Set up mocked out resources
        resources.UnitTest = true;
        // Use a dummy home location so we don't trash any real configurations
        process.env["TACO_HOME"] = tacoHome;
        // Create a mocked out remote server so we can specify how it reacts
        testHttpServer = http.createServer();
        var port = 3000;
        testHttpServer.listen(port);
        // Configure a dummy platform "test" to use the mocked out remote server in insecure mode
        SetupMock.saveConfig("test", { host: "localhost", port: 3000, secure: false, mountPoint: "cordova" }).done(function (): void {
            mocha();
        }, function (err: any): void {
            mocha(err);
        });
    });

    after(function (): void {
        testHttpServer.close();
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

    var runRun = function (args: string[]): Q.Promise<any> {
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
                    buildNumber: buildNumber,
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
                    buildNumber: buildNumber,
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
                    buildNumber: buildNumber,
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
});