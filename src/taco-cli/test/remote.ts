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

/* tslint:disable:no-var-requires */
// var require needed for should module to work correctly
// Note not import: We don't want to refer to shouldModule, but we need the require to occur since it modifies the prototype of Object.
var shouldModule: any = require("should");
/* tslint:enable:no-var-requires */

import fs = require ("fs");
import http = require ("http");
import https = require ("https");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import request = require ("request");
import rimraf = require ("rimraf");

import ConnectionSecurityHelper = require ("../cli/remoteBuild/connectionSecurityHelper");
import IHttpServerFunction = require ("./utils/httpServerFunction");
import resources = require ("../resources/resourceManager");
import ServerMock = require ("./utils/serverMock");
import Settings = require ("../cli/utils/settings");
import RemoteMod = require ("../cli/remote");
import RemoteMock = require ("./utils/remoteMock");
import IRemoteServerSequence = require ("./utils/remoteServerSequence");
import TacoUtility = require ("taco-utils");
import ms = require ("./utils/memoryStream");
import commandHelper = require ("./utils/commandHelper");
import TacoCommandBase = TacoUtility.Commands.TacoCommandBase;

import utils = TacoUtility.UtilHelper;

var remote: TacoCommandBase = commandHelper.getCommand("remote");

describe("taco remote", function(): void {
    var testHome: string = path.join(os.tmpdir(), "taco-cli", "setup");
    var tacoSettingsFile: string = path.join(testHome, "TacoSettings.json");
    before(function(): void {
        utils.createDirectoryIfNecessary(testHome);
        process.env["TACO_HOME"] = testHome;
        process.env["TACO_UNIT_TEST"] = true;
        if (fs.existsSync(tacoSettingsFile)) {
            fs.unlinkSync(tacoSettingsFile);
        }
    });

    after(function(done: MochaDone): void {
        if (fs.existsSync(tacoSettingsFile)) {
            fs.unlinkSync(tacoSettingsFile);
        }

        rimraf(testHome, function(err: Error): void { done(); }); // ignore errors
    });

    function makeICommandData(args: string[]): TacoUtility.Commands.ICommandData {
        return {
            options: {},
            original: args,
            remain: args
        };
    }

    it("should handle arguments", function(): void {
        remote.canHandleArgs(makeICommandData(["remote", "ios"])).should.be.true;
        // Even bad arguments should return true because we don't want to pass through to cordova
        remote.canHandleArgs(makeICommandData(["foo"])).should.be.true;
        remote.canHandleArgs(makeICommandData([])).should.be.true;
    });

    var remoteRun: (args: string[]) => Q.Promise<any> = function(args: string[]): Q.Promise<any> {
        return remote.run(makeICommandData(args));
    };

    it("should save in the expected format", function(mocha: MochaDone): void {
        var questionsAsked: number = 0;
        var sessionClosed: boolean = false;
        var desiredState: { host: string; port: number; pin: string } = {
            host: "localhost",
            port: 3000,
            pin: ""
        };
        var desiredMountPoint: string = "testMountPoint";
        var expectedSequence: IRemoteServerSequence[] = [
            {
                expectedUrl: "/modules/taco-remote",
                head: {
                    "Content-Type": "text/plain"
                },
                statusCode: 200,
                response: desiredMountPoint
            }
        ];
        var mockServer: http.Server = http.createServer();
        var serverFunction: IHttpServerFunction = ServerMock.generateServerFunction(mocha, expectedSequence);

        var cliVersion: string = require("../package.json").version;
        var expectedTelemetryProperties: TacoUtility.ICommandTelemetryProperties = {
            subCommand: { isPii: false, value: "add" },
            platform: { isPii: false, value: "ios" },
            isSecure: { isPii: false, value: "false" }
        };

        mockServer.listen(desiredState.port);
        mockServer.on("request", serverFunction);

        RemoteMod.cliSession = RemoteMock.makeCliMock(mocha, () => { sessionClosed = true; }, desiredState, () => { questionsAsked++; });
        Q(["add", "ios"]).then(remoteRun).then(function(telemetryParameters: TacoUtility.ICommandTelemetryProperties): void {
            // Verify telemetry properties               
            telemetryParameters.should.be.eql(expectedTelemetryProperties);
            if (questionsAsked !== 3) {
                throw new Error("Wrong number of questions asked: " + questionsAsked);
            } else if (!sessionClosed) {
                throw new Error("CLI Session not closed");
            }
        }).then(function(): Q.Promise<Settings.ISettings> {
            return Settings.loadSettings();
        }).then(function(data: Settings.ISettings): void {
            data.remotePlatforms["ios"].should.eql(
                {
                    host: desiredState.host,
                    port: desiredState.port,
                    secure: desiredState.pin !== "",
                    mountPoint: desiredMountPoint
                });
        }).finally(function(): void {
            mockServer.close();
        }).done(function(): void {
            mocha();
        }, mocha);
    });

    it("should print help for unknown parameters", function(mocha: MochaDone): void {
        RemoteMod.cliSession = {
            question: function(question: string, callback: (answer: string) => void): void {
                mocha(new Error("Should not get as far as querying the user with invalid paramters"));
            },
            close: function(): void {
                mocha(new Error("Should not get as far as querying the user with invalid paramters"));
            }
        };

        Q([]).then(remoteRun).then(function(): void {
            mocha();
        }, function(e: Error): void {
            mocha(new Error("Should have printed help"));
        });
    });

    it("should be able to configure secure connections", function(mocha: MochaDone): void {
        this.timeout(20000);
        var mockServer: https.Server = ServerMock.createSecureTestServer();
        var desiredState = {
            host: "localhost",
            port: 3000,
            pin: "123456",
            mountPoint: "cordova"
        };
        var expectedSequence: IRemoteServerSequence[] = [
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

        var serverFunction: IHttpServerFunction = ServerMock.generateServerFunction(mocha, expectedSequence);
        mockServer.listen(desiredState.port);
        mockServer.on("request", serverFunction);

        RemoteMod.cliSession = RemoteMock.makeCliMock(mocha, utils.emptyMethod, desiredState);
        Q(["add", "ios"]).then(remoteRun).then(function(): Q.Promise<Settings.ISettings> {
            return Settings.loadSettings();
        }).then(function(data: Settings.ISettings): Q.Promise<void> {
            data.remotePlatforms["ios"].should.eql({
                host: desiredState.host,
                port: desiredState.port,
                secure: true,
                certName: data.remotePlatforms["ios"].certName, // Ignore the certName: it is used by windows, but not by osx
                mountPoint: desiredState.mountPoint
            });
            return ConnectionSecurityHelper.getAgent(data.remotePlatforms["ios"]).then(function(agent: https.Agent): Q.Promise<any> {
                // Now that a cert is configured, try making a secure connection to the (mocked) server to make sure the cert works.
                // TODO: Remove the casting once we've get some complete/up-to-date .d.ts files. See https://github.com/Microsoft/TACO/issues/18
                var options: request.Options = <request.Options> {
                    url: Settings.getRemoteServerUrl(data.remotePlatforms["ios"]) + "/testCertUsage",
                    headers: { "Accept-Language": "en" },
                    agent: agent
                };

                var deferred: Q.Deferred<any> = Q.defer<any>();
                request.get(options, function(err: any, response: any, body: any): void {
                    if (err) {
                        mocha(err);
                    } else {
                        deferred.resolve({});
                    }
                });
                return deferred.promise;
            });
        }).finally(function(): void {
            mockServer.close();
        }).done(function(): void {
            mocha();
        }, mocha);
    });

    describe("Onboarding experience", function(): void {
        // because of function overloading assigning "(buffer: string, cb?: Function) => boolean" as the type for
        // stdoutWrite just doesn't work
        var stdoutWrite = process.stdout.write; // We save the original implementation, so we can restore it later
        var memoryStdout: ms.MemoryStream;

        beforeEach(() => {
            memoryStdout = new ms.MemoryStream; // Each individual test gets a new and empty console
            process.stdout.write = memoryStdout.writeAsFunction(); // We'll be printing into an "in-memory" console, so we can test the output
        });

        after(() => {
            // We just need to reset the stdout just once, after all the tests have finished
            process.stdout.write = stdoutWrite;
        });

        // Here you can write to the console with logger.log(...) and then you'll be able to 
        //    retrieve the contents from the memory stream
        it("prints the onboarding experience when adding a new remote", function(done: MochaDone): void {
            this.timeout(5000);
            var desiredState = {
                host: "localhost",
                port: 3000,
                pin: "",
                mountPoint: "testMountPoint"
            };
            var expectedSequence: IRemoteServerSequence[] = [
                {
                    expectedUrl: "/modules/taco-remote",
                    head: {
                        "Content-Type": "text/plain"
                    },
                    statusCode: 200,
                    response: desiredState.mountPoint
                }
            ];

            var mockServer: http.Server = http.createServer();
            var serverFunction: IHttpServerFunction = ServerMock.generateServerFunction(done, expectedSequence);
            mockServer.listen(desiredState.port);
            mockServer.on("request", serverFunction);

            RemoteMod.cliSession = RemoteMock.makeCliMock(done, utils.emptyMethod, desiredState, utils.emptyMethod);
            remoteRun(["add", "ios"]).finally(function(): void {
                mockServer.close();
            }).done(() => {
                var messages: string[] = ["CommandRemoteHeader",
                    "CommandRemoteSettingsStored",
                    "OnboardingExperienceTitle",
                    " * HowToUseCommandBuildPlatform",
                    " * HowToUseCommandEmulatePlatform",
                    " * HowToUseCommandRunPlatform",
                    "",
                    "HowToUseCommandHelp",
                    "HowToUseCommandDocs",
                    ""]; // Get the expected console output
                var expected: string = messages.join("\n");
                var actual: string = memoryStdout.contentsAsText();
                actual.should.be.equal(expected);
                done();
            }, done);
        });
    });
});
