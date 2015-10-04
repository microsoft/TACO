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
/// <reference path="../../typings/del.d.ts" />
/// <reference path="../../typings/node.d.ts"/>

"use strict";

import del = require ("del");
import fs = require ("fs");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import rimraf = require ("rimraf");
import should = require ("should");

import createMod = require ("../cli/create");
import kitHelper = require ("../cli/utils/kitHelper");
import resources = require ("../resources/resourceManager");
import Settings = require ("../cli/utils/settings");
import RemoteMock = require ("./utils/remoteMock");
import TacoUtility = require ("taco-utils");
import CheckForNewerVersion = require ("../cli/utils/checkForNewerVersion");
import ms = require ("./utils/memoryStream");
import http = require ("http");
import ServerMock = require ("./utils/serverMock");

import utils = TacoUtility.UtilHelper;

enum MessageExpectation {
    WillBeShown,
    WontBeShown
}

describe("Check for newer version", function (): void {
    var tacoHome: string = path.join(os.tmpdir(), "taco-cli", "check-for-new-version");

    // Use a dummy home location so we don't trash any real configurations
    process.env["TACO_HOME"] = tacoHome;
    // because of function overloading assigning "(buffer: string, cb?: Function) => boolean" as the type for
    // stdoutWrite just doesn't work
    var stdoutWrite: any = process.stdout.write; // We save the original implementation, so we can restore it later
    var memoryStdout: ms.MemoryStream;

    var expectedRequestAndResponse: { expectedUrl: string; statusCode: number; head: any; response: any; waitForPayload?: boolean, responseDelay?: number };

    // We should be able to remove the next line, after this fix gets released: https://github.com/mochajs/mocha/issues/779
    this.timeout(15000);
    var tacoCliLatestInformation: any;

    var fakeServer: string = "http://localhost:8080";
    var repositoryPath: string = "/taco-cli/latest";
    var repositoryInFakeServerPath: string = fakeServer + repositoryPath;
    var packageFilePath: string = path.join(utils.tacoHome, "package.json");

    before(() => {
        // Set up mocked out resources
        process.env["TACO_UNIT_TEST"] = true;

        process.listeners("beforeExit").should.be.empty; // We can't run the tests if we have unexpected beforeExit listeners
    });

    beforeEach(() => {
        memoryStdout = new ms.MemoryStream; // Each individual test gets a new and empty console
        process.stdout.write = memoryStdout.writeAsFunction(); // We'll be printing into an "in-memory" console, so we can test the output

        // These contents were copied from http://registry.npmjs.org/remotebuild/latest and then renamed to what should be a taco-cli response
        tacoCliLatestInformation = {
            name: "taco-cli",
            description: "Front-end server that serves modules that implement remote build functionality, such as taco-remote.",
            version: "1.0.0",
            author: {
                name: "Microsoft Corporation",
                email: "vscordovatools-admin@microsoft.com"
            },
            homepage: "http://msdn.microsoft.com/en-us/vstudio/dn722381",
            main: "./lib/server.js",
            bin: {
                remotebuild: "./bin/remotebuild"
            },
            keywords: [
                "cordova",
                "osx ",
                "remote build"
            ],
            preferGlobal: true,
            dependencies: {
                express: "4.12.2",
                morgan: "1.5.1",
                errorhandler: "1.3.4",
                nconf: "0.6.9",
                q: "1.0.1",
                rimraf: "2.2.6",
                "taco-utils": "1.0.0",
                "taco-remote": "1.0.0"
            },
            optionalDependencies: {
                "taco-remote": "1.0.0"
            },
            devDependencies: {
                typescript: "1.3.0",
                mocha: "2.0.1",
                mkdirp: "0.3.5",
                should: "4.3.0",
                request: "2.36.0"
            },
            scripts: {
                test: "mocha"
            },
            directories: {
                lib: "lib",
                doc: ".",
                test: "test",
                example: "examples"
            },
            license: "MIT",
            _id: "remotebuild@1.0.0",
            _shasum: "9b33d502b22f8ba8977e11c4a7db93bde5037e88",
            _resolved: "file:remotebuild.tgz",
            _from: "remotebuild.tgz",
            _npmVersion: "2.7.4",
            _nodeVersion: "0.12.2",
            _npmUser: {
                name: "multidevicehybridapp",
                email: "vscordovatools-admin@microsoft.com"
            },
            dist: {
                shasum: "9b33d502b22f8ba8977e11c4a7db93bde5037e88",
                tarball: "http://registry.npmjs.org/remotebuild/-/remotebuild-1.0.0.tgz"
            },
            maintainers: [
                {
                    name: "multidevicehybridapp",
                    email: "vscordovatools-admin@microsoft.com"
                }
            ]
        };

        // Create the package.json
        utils.createDirectoryIfNecessary(tacoHome);
        fs.writeFileSync(packageFilePath, JSON.stringify(tacoCliLatestInformation));

        // Default request answered by the fake NPM server
        expectedRequestAndResponse = {
            expectedUrl: repositoryPath,
            head: { "Content-Type": "application/json" },
            statusCode: 200,
            response: JSON.stringify(tacoCliLatestInformation)
        };

        /* By default there is an update available. We do this after writing the package.json file
            Because we want 1.0.0 to be the current version, and after the expectedRequestAndResponse because
            it's required */
        setLatestReleasedVersion("1.0.1");
    });

    afterEach(() => {
        process.stdout.write = stdoutWrite;
        process.removeAllListeners("beforeExit");
        Settings.forgetSettings();
        try {
            // Not all tests create the file, so we ignore the exception
            fs.unlinkSync(Settings.settingsFile);
        } catch (exception) {
            utils.emptyMethod();
        }
    });

    function simulateBeforeExit(): void {
        var listeners: Function[] = process.listeners("beforeExit");
        listeners.length.should.eql(1, "There should be only a single listener for the beforeExit event");
        process.removeListener("beforeExit", listeners[0]);
        listeners[0]();
    }

    function launchFakeNPMServer(done: MochaDone): Q.Promise<http.Server> {
        var serverIsListening: Q.Deferred<http.Server> = Q.defer<http.Server>();

        // Port for the web server
        const PORT: number = 8080;

        // Create the server
        var server: http.Server = http.createServer(ServerMock.generateServerFunction(done, [expectedRequestAndResponse]));
        server.listen(PORT);

        // If there is any error, we reject the promise
        server.on("error", (error: any) => {
            serverIsListening.reject(error);
        });

        // Make the server start listening
        server.listen(PORT, () => {
            serverIsListening.resolve(server);
        });

        return serverIsListening.promise;
    }

    function testCheckForNewerVersion(messageExpectation: MessageExpectation, done: MochaDone): void {
        var timeBeforeTest: number  = Date.now();
        var fakeNPMServer: http.Server;
        launchFakeNPMServer(done)
            .then((server: http.Server) => fakeNPMServer = server)
            .then(() => new CheckForNewerVersion(repositoryInFakeServerPath, packageFilePath)
                .showOnExit()
                .fail((error: Error) => TacoUtility.UtilHelper.emptyMethod(error)))
            .then(() => {
                // CheckForNewerVersion doesn't print anything synchronically. It prints it on the beforeExit event
                var actual: string = memoryStdout.contentsAsText();
                should(actual).be.empty;

                if (messageExpectation === MessageExpectation.WillBeShown) {
                    simulateBeforeExit();
                    actual = memoryStdout.contentsAsText();
                    actual.should.be.equal("NewerTacoCLIVersionAvailable\n",
                        "The output of the console should match what we expected");
                    return Settings.loadSettings().then((settings: Settings.ISettings) => {
                        var lastCheck: number = new Date(settings.lastCheckForNewerVersionTimestamp).getTime();
                        lastCheck.should.be.greaterThan(timeBeforeTest,
                            "The last check for newer version timestamp: " + lastCheck + " should be updated after each attempt to check for a newer version and thus be greater than " + timeBeforeTest);
                        done();
                    });
                } else {
                    process.listeners("beforeExit").should.be.empty; // We shouldn't have any listeners if no message is expected
                    done();
                }
            })
            .finally(() => {
                fakeNPMServer.close();
            })
            .done();
    }

    function setCheckedTimestampToHoursAgo(howManyHoursAgo: number): Q.Promise<number> {
        var someHoursAgo: Date = new Date();
        someHoursAgo.setHours(someHoursAgo.getHours() - howManyHoursAgo);
        var lastCheckForNewerVersionTimestamp: number = someHoursAgo.getTime();
        return Settings.updateSettings((settings: Settings.ISettings) => settings.lastCheckForNewerVersionTimestamp = lastCheckForNewerVersionTimestamp).then(() => lastCheckForNewerVersionTimestamp);
    }

    function setLatestReleasedVersion(version: string): void {
        tacoCliLatestInformation.version = version;
        expectedRequestAndResponse.response = JSON.stringify(tacoCliLatestInformation);
    }

    it("shows message when there is an update available and it's the first time we've ever checked", (done: MochaDone) => {
        this.timeout(10000);

        testCheckForNewerVersion(MessageExpectation.WillBeShown, done);
    });

    it("doesn't run the check if we've checked 3 hours ago", (done: MochaDone) => {
        this.timeout(10000);

        var lastCheckForNewerVersionTimestamp: number;
        setCheckedTimestampToHoursAgo(3)
            .then((storedNumber: number) => lastCheckForNewerVersionTimestamp = storedNumber)
            .then(() => new CheckForNewerVersion(repositoryInFakeServerPath, packageFilePath).showOnExit().fail(utils.emptyMethod))
            .done(() => {
                var listeners: Function[] = process.listeners("beforeExit");
                listeners.length.should.eql(0, "There should be no listeners for the beforeExit event");
                var actual: string = memoryStdout.contentsAsText();
                should(actual).be.empty;
                return Settings.loadSettings().then((settings: Settings.ISettings) => {
                    settings.lastCheckForNewerVersionTimestamp.should.be.equal(lastCheckForNewerVersionTimestamp,
                        "The last checked time shouldn't had changed expected: " + lastCheckForNewerVersionTimestamp + "  actual: " + settings.lastCheckForNewerVersionTimestamp.should);
                    done();
                });
            });
    });

    it("does run the check if we've checked 5 hours ago", (done: MochaDone) => {
        this.timeout(10000);

        setCheckedTimestampToHoursAgo(5)
            .done(() => testCheckForNewerVersion(MessageExpectation.WillBeShown, done));
    });

    it("doesn't show a message when there is not an update available", (done: MochaDone) => {
        this.timeout(10000);
        setLatestReleasedVersion("1.0.0");

        testCheckForNewerVersion(MessageExpectation.WontBeShown, done);
    });

    it("doesn't show any errors if the http request times out", (done: MochaDone) => {
        this.timeout(15000);

        expectedRequestAndResponse.responseDelay = 10 * 1000; // 10 seconds
        testCheckForNewerVersion(MessageExpectation.WontBeShown, done);
    });

    it("doesn't show any errors if the http request fails with 4xx", (done: MochaDone) => {
        this.timeout(10000);

        expectedRequestAndResponse.statusCode = 401;
        testCheckForNewerVersion(MessageExpectation.WontBeShown, done);
    });

    it("doesn't show any errors if the http request fails", (done: MochaDone) => {
        this.timeout(10000);

        expectedRequestAndResponse.statusCode = 500;
        expectedRequestAndResponse.response = "There was a fake internal error"; // The body.version property doesn't exist with this response. It's also not JSON
        testCheckForNewerVersion(MessageExpectation.WontBeShown, done);
    });

    it("works if the settings file is empty", (done: MochaDone) => {
        this.timeout(10000);

        // Create an empty settings file
        Settings.saveSettings({});

        testCheckForNewerVersion(MessageExpectation.WillBeShown, done);
    });
});
