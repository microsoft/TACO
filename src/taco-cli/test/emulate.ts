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
var should = require("should"); // Note not import: We don't want to refer to should_module, but we need the require to occur since it modifies the prototype of Object.

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
import emulateMod = require ("../cli/emulate");
import ServerMock = require ("./utils/serverMock");
import RemoteMock = require ("./utils/remoteMock");
import TacoUtility = require ("taco-utils");

import BuildInfo = TacoUtility.BuildInfo;
import Command = buildAndRunTelemetry.Command;
import utils = TacoUtility.UtilHelper;

var create = new createMod();

describe("taco emulate", function (): void {
    var testHttpServer: http.Server;
    var tacoHome = path.join(os.tmpdir(), "taco-cli", "emulate");
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

    var emulateRun = function (args: string[]): Q.Promise<TacoUtility.ICommandTelemetryProperties> {
        var emulate = new emulateMod();
        return emulate.run({
            options: {},
            original: args,
            remain: args
        });
    };

    describe("telemetry", () => {
        buildAndRunTelemetry.createBuildAndRunTelemetryTests.call(this, emulateRun, Command.Emulate);
    });
});
