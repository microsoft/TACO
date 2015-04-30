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
"use strict";
var should_module = require("should"); // Note not import: We don't want to refer to should_module, but we need the require to occur since it modifies the prototype of Object.

import fs = require ("fs");
import http = require ("http");
import https = require ("https");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import request = require ("request");
import rimraf = require ("rimraf");

import ConnectionSecurityHelper = require ("../cli/remoteBuild/connectionSecurityHelper");
import resources = require ("../resources/resourceManager");
import ServerMock = require ("./utils/serverMock");
import Settings = require ("../cli/utils/settings");
import SetupMod = require ("../cli/setup");
import SetupMock = require ("./utils/setupMock");
import TacoUtility = require ("taco-utils");
import utils = TacoUtility.UtilHelper;

var setup = new SetupMod();

describe("taco setup", function (): void {
    var testHome = path.join(os.tmpdir(), "taco-cli", "setup");
    var tacoSettingsFile = path.join(testHome, "TacoSettings.json");
    before(function (): void {
        utils.createDirectoryIfNecessary(testHome);
        process.env["TACO_HOME"] = testHome;
        // Set up mocked out resources
        process.env["TACO_UNIT_TEST"] = true;
        if (fs.existsSync(tacoSettingsFile)) {
            fs.unlinkSync(tacoSettingsFile);
        }
    });

    after(function (): void {
        if (fs.existsSync(tacoSettingsFile)) {
            fs.unlinkSync(tacoSettingsFile);
        }

        rimraf(testHome, function (err: Error): void { /* ignored */ }); // Not sync, and ignore errors
    });

    function makeICommandData(args: string[]): TacoUtility.Commands.ICommandData {
        return {
            options: {},
            original: args,
            remain: args
        };
    }

    it("should handle arguments", function (): void {
        setup.canHandleArgs(makeICommandData(["remote", "ios"])).should.be.true;
        // Even bad arguments should return true because we don't want to pass through to cordova
        setup.canHandleArgs(makeICommandData(["foo"])).should.be.true;
        setup.canHandleArgs(makeICommandData([])).should.be.true;
    });

    var setupRun = function (args: string[]): Q.Promise<any> {
        return setup.run(makeICommandData(args));
    };

    it("should save in the expected format", function (mocha: MochaDone): void {
        var questionsAsked = 0;
        var sessionClosed = false;
        var desiredState = {
            host: "localhost",
            port: 3000,
            pin: "",
            mountPoint: "testMountPoint"
        };
        var expectedSequence = [
            {
                expectedUrl: "/modules/taco-remote",
                head: {
                    "Content-Type": "text/plain"
                },
                statusCode: 200,
                response: desiredState.mountPoint
            }
        ];
        var mockServer = http.createServer();
        var serverFunction = ServerMock.generateServerFunction(mocha, expectedSequence);
        mockServer.listen(desiredState.port);
        mockServer.on("request", serverFunction);

        SetupMod.CliSession = SetupMock.makeCliMock(mocha, () => { sessionClosed = true; }, desiredState, () => { questionsAsked++; });
        Q(["remote", "ios"]).then(setupRun).then(function (): void {
            if (questionsAsked !== 3) {
                throw new Error("Wrong number of questions asked: " + questionsAsked);
            } else if (!sessionClosed) {
                throw new Error("CLI Session not closed");
            }
        }).then(function (): Q.Promise<Settings.ISettings> {
            return Settings.loadSettings();
        }).then(function (data: Settings.ISettings): void {
            data.remotePlatforms["ios"].should.eql(
                {
                    host: desiredState.host,
                    port: desiredState.port,
                    secure: desiredState.pin !== "",
                    mountPoint: desiredState.mountPoint
                });
        }).finally(function (): void {
            mockServer.close();
        }).done(function (): void {
            mocha();
        }, mocha);
    });

    it("should reject unknown parameters", function (mocha: MochaDone): void {
        SetupMod.CliSession = {
            question: function (question: string, callback: (answer: string) => void): void {
                mocha(new Error("Should not get as far as querying the user with invalid paramters"));
            },
            close: function (): void {
                mocha(new Error("Should not get as far as querying the user with invalid paramters"));
            }
        };

        Q([]).then(setupRun).then(function (): void {
            mocha(new Error("Should have errored out due to bad input"));
        }, function (e: Error): void {
            if (e.message === "command.badArguments") {
                mocha();
            } else {
                mocha(new Error("Unknown error: " + e));
            }
        });
    });

    it("should be able to configure secure connections", function (mocha: MochaDone): void {
        this.timeout(10000);
        var mockServer = ServerMock.createSecureTestServer();
        var desiredState = {
            host: "localhost",
            port: 3000,
            pin: "123456",
            mountPoint: "cordova"
        };
        var expectedSequence = [
            {
                expectedUrl: "/certs/" + desiredState.pin,
                head: {
                    "Content-Type": "application/octet-stream"
                },
                statusCode: 200,
                response: fs.readFileSync(path.resolve(__dirname, "resources", "certs", "client.pfx"))
            },
            {
                expectedUrl: "/modules/taco-remote",
                head: {
                    "Content-Type": "text/plain"
                },
                statusCode: 200,
                response: desiredState.mountPoint
            },
            {
                expectedUrl: "/cordova/testCertUsage",
                head: {
                    "Content-Type": "text/plain"
                },
                statusCode: 200,
                response: "success"
            }
        ];
        var serverFunction = ServerMock.generateServerFunction(mocha, expectedSequence);
        mockServer.listen(desiredState.port);
        mockServer.on("request", serverFunction);

        SetupMod.CliSession = SetupMock.makeCliMock(mocha, () => { }, desiredState);
        Q(["remote", "ios"]).then(setupRun).then(function (): Q.Promise<Settings.ISettings> {
            return Settings.loadSettings();
        }).then(function (data: Settings.ISettings): Q.Promise<void> {
            data.remotePlatforms["ios"].should.eql({
                host: desiredState.host,
                port: desiredState.port,
                secure: true,
                certName: data.remotePlatforms["ios"].certName, // Ignore the certName: it is used by windows, but not by osx
                mountPoint: desiredState.mountPoint
            });
            return ConnectionSecurityHelper.getAgent(data.remotePlatforms["ios"]).then(function (agent: https.Agent): Q.Promise<any> {
                // Now that a cert is configured, try making a secure connection to the (mocked) server to make sure the cert works.
                var options: request.Options = {
                    url: Settings.getRemoteServerUrl(data.remotePlatforms["ios"]) + "/testCertUsage",
                    headers: { "Accept-Language": "en" },
                    agent: agent
                };

                var deferred = Q.defer<any>();
                request.get(options, function (err: any, response: any, body: any): void {
                    if (err) {
                        mocha(err);
                    } else {
                        deferred.resolve({});
                    }
                });
                return deferred.promise;
            });
        }).finally(function (): void {
            mockServer.close();
        }).done(function (): void {
            mocha();
        }, mocha);
    });
});