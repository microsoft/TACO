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
var should_module = require("should"); // Note not import: We don't want to refer to should_module, but we need the require to occur since it modifies the prototype of Object.

import del = require ("del");
import fs = require ("fs");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import rimraf = require ("rimraf");

import createMod = require ("../cli/create");
import kitHelper = require ("../cli/utils/kitHelper");
import resources = require ("../resources/resourceManager");
import Settings = require ("../cli/utils/settings");
import RemoteMock = require ("./utils/remoteMock");
import TacoUtility = require ("taco-utils");
import checkForNewerVersion = require ("../cli/utils/checkForNewerVersion");
import ms = require ("./utils/memoryStream");
import http = require ("http");

import utils = TacoUtility.UtilHelper;
import CheckForNewerVersion = checkForNewerVersion.CheckForNewerVersion;

class FakeNPMSeverOptions {
    public updateResponse: { (response: any): void } = response => { };
    public responseDelay: number = 0;
    public responseStatusCode: number = 200;
    public generateResponseText: { (info: any): string } = info => JSON.stringify(info);
}

enum MessageExpectation {
    WillBeShown,
    WontBeShown
}

describe("Check for newer version", function (): void {
    // These contents were copied from http://registry.npmjs.org/remotebuild/latest and then renamed to what should be a taco-cli response
    var tacoCliLatestInformation: any = {
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

    var tacoHome = path.join(os.tmpdir(), "taco-cli", "settings");
    var originalCwd: string;

    var stdoutWrite = process.stdout.write; // We save the original implementation, so we can restore it later
    var memoryStdout: ms.MemoryStream;

    var fakeNPMServerOptions: FakeNPMSeverOptions;
    var fakeNPMServer: http.Server;

    // We should be able to remove the next line, after this fix gets released: https://github.com/mochajs/mocha/issues/779
    this.timeout(15000);

    before((done: MochaDone) => {
        // Set up mocked out resources
        process.env["TACO_UNIT_TEST"] = true;
        // Use a dummy home location so we don't trash any real configurations
        process.env["TACO_HOME"] = tacoHome;

        process.listeners("beforeExit").should.be.empty; // We can't run the tests if we have unexpected beforeExit listeners

        // Create the package.json
        fs.writeFileSync(packageFilePath, JSON.stringify(tacoCliLatestInformation));

        // Launch fake NPM Server
        launchFakeNPMServer().done(server => {
            fakeNPMServer = server;
            done();
        });
    });

    beforeEach(() => {
        memoryStdout = new ms.MemoryStream; // Each individual test gets a new and empty console
        process.stdout.write = memoryStdout.writeAsFunction(); // We'll be printing into an "in-memory" console, so we can test the output

        fakeNPMServerOptions = new FakeNPMSeverOptions();

        // Create an empty settings file
        Settings.saveSettings({});
    });

    afterEach(() => {
        process.stdout.write = stdoutWrite;
        process.removeAllListeners("beforeExit");
    });

    after((done: MochaDone) => {
        this.timeout(60000);
        fakeNPMServer.close(() => {
            fs.unlink(Settings.settingsFile, done);
        });
    });

    function simulateBeforeExit(): void {
        var listeners = process.listeners("beforeExit");
        listeners.length.should.eql(1, "There should be only a single listener for the beforeExit event");
        process.removeListener("beforeExit", listeners[0]);
        listeners[0]();
    }

    var fakeServer = "http://localhost:8080";
    var repositoryPath = "/taco-cli/latest";
    var repositoryInFakeServerPath = fakeServer + repositoryPath;
    var packageFilePath = path.join(utils.tacoHome, "package.json");

    function launchFakeNPMServer(): Q.Promise<http.Server> {
        var serverIsListening = Q.defer<http.Server>();

        // Port for the web server
        const PORT = 8080;

        // Create the server
        var server = http.createServer((request: http.ServerRequest, response: http.ServerResponse) => {
            if (request.url === repositoryPath) {
                response.writeHead(fakeNPMServerOptions.responseStatusCode, { "Content-Type": "application/json" });
                fakeNPMServerOptions.updateResponse(tacoCliLatestInformation);
                var responseText: string = fakeNPMServerOptions.generateResponseText(tacoCliLatestInformation);
                setTimeout(() => response.end(responseText), fakeNPMServerOptions.responseDelay);
            } else {
                throw "Unexpected request: " + request.url;
            }
        });

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
        var timeBeforeTest = Date.now();
        new CheckForNewerVersion(repositoryInFakeServerPath, packageFilePath).showOnExit().fail(error => { })
            .then(() => {
                // CheckForNewerVersion doesn't print anything synchronically. It prints it on the beforeExit event
                var actual = memoryStdout.contentsAsText();
                actual.should.be.empty;

                if (messageExpectation === MessageExpectation.WillBeShown) {
                    simulateBeforeExit();
                    var actual = memoryStdout.contentsAsText();
                    actual.should.be.equal("NewerTacoCLIVersionAvailable\n",
                        "The output of the console should match what we expected");
                    return Settings.loadSettings().then(settings => {
                        var lastCheck = new Date(parseInt(settings.lastCheckForNewerVersionTimestamp)).getTime();
                        lastCheck.should.be.greaterThan(timeBeforeTest,
                            "The last check for newer version timestamp: " + lastCheck + " should be updated after each attempt to check for a newer version and thus be greater than " + timeBeforeTest);
                        done();
                    });
                } else {
                    process.listeners("beforeExit").should.be.empty; // We shouldn't have any listeners if no message is expected
                    done();
                }
            })
            .done();
    }

    function setCheckedTimestampToHoursAgo(howManyHoursAgo: number): Q.Promise<string> {
        var someHoursAgo = new Date();
        someHoursAgo.setHours(someHoursAgo.getHours() - howManyHoursAgo);
        var lastCheckForNewerVersionTimestamp = someHoursAgo.getTime().toString();
        return Settings.updateSettings(settings => settings.lastCheckForNewerVersionTimestamp = lastCheckForNewerVersionTimestamp).then(() => lastCheckForNewerVersionTimestamp);
    }

    it("shows message when there is an update available and it's the first time we've ever checked", done => {
        this.timeout(10000);
        fakeNPMServerOptions.updateResponse = response => response.version = "1.0.1";
        testCheckForNewerVersion(MessageExpectation.WillBeShown, done);
    });

    it("doesn't run the check if we've checked 3 hours ago", done => {
        this.timeout(10000);
        var lastCheckForNewerVersionTimestamp: string;
        setCheckedTimestampToHoursAgo(3)
            .then(storedString => lastCheckForNewerVersionTimestamp = storedString)
            .then(() => new CheckForNewerVersion(repositoryInFakeServerPath, packageFilePath).showOnExit().fail(failure => { }))
            .done(() => {
                var listeners = process.listeners("beforeExit");
                listeners.length.should.eql(0, "There should be no listeners for the beforeExit event");
                var actual = memoryStdout.contentsAsText();
                actual.should.be.empty;
                return Settings.loadSettings().then(settings => {
                    settings.lastCheckForNewerVersionTimestamp.should.be.equal(lastCheckForNewerVersionTimestamp,
                        "The last checked time shouldn't had changed expected: " + lastCheckForNewerVersionTimestamp + "  actual: " + settings.lastCheckForNewerVersionTimestamp.should);
                    done();
                });
            });
    });

    it("does run the check if we've checked 5 hours ago", done => {
        this.timeout(10000);
        setCheckedTimestampToHoursAgo(5)
            .done(() => testCheckForNewerVersion(MessageExpectation.WillBeShown, done));
    });

    it("doesn't show a message when there is not an update available", done => {
        this.timeout(10000);
        fakeNPMServerOptions.updateResponse = response => response.version = "1.0.0";
        testCheckForNewerVersion(MessageExpectation.WontBeShown, done);
    });

    it("doesn't show any errors if the http request times out", done => {
        this.timeout(15000);
        fakeNPMServerOptions.responseDelay = 10 * 1000; // 10 seconds
        testCheckForNewerVersion(MessageExpectation.WontBeShown, done);
    });

    it("doesn't show any errors if the http request fails with 4xx", done => {
        this.timeout(10000);
        fakeNPMServerOptions.responseStatusCode = 401;
        testCheckForNewerVersion(MessageExpectation.WontBeShown, done);
    });

    it("doesn't show any errors if the http request fails", done => {
        this.timeout(10000);
        fakeNPMServerOptions.responseStatusCode = 500;
        fakeNPMServerOptions.generateResponseText = info => "There was a fake internal error"; // The body.version property doesn't exist with this response. It's also not JSON
        testCheckForNewerVersion(MessageExpectation.WontBeShown, done);
    });
});
