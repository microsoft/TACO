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
"use strict";
var should_module = require("should"); // Note not import: We don't want to refer to should_module, but we need the require to occur since it modifies the prototype of Object.

import del = require ("del");
import fs = require ("fs");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import rimraf = require ("rimraf");

import createMod = require ("../cli/create");
import resources = require ("../resources/resourceManager");
import Settings = require ("../cli/utils/settings");
import RemoteMock = require ("./utils/remoteMock");
import TacoUtility = require ("taco-utils");

import utils = TacoUtility.UtilHelper;

var create = new createMod();

describe("taco settings", function (): void {
    var tacoHome = path.join(os.tmpdir(), "taco-cli", "settings");
    var originalCwd: string;

    before(function (mocha: MochaDone): void {
        originalCwd = process.cwd();
        // Set up mocked out resources
        process.env["TACO_UNIT_TEST"] = true;
        // Use a dummy home location so we don't trash any real configurations
        process.env["TACO_HOME"] = tacoHome;
        // Configure a dummy platform "test" to use the mocked out remote server
        RemoteMock.saveConfig("ios", { host: "localhost", port: 3000, secure: false, mountPoint: "cordova" }).done(function (): void {
            mocha();
        }, function (err: any): void {
            mocha(err);
        });
    });

    after(function (done: MochaDone): void {
        this.timeout(50000);
        process.chdir(originalCwd);
        rimraf(tacoHome, done);
    });

    it("should correctly report build locations when --local is specified", function (mocha: MochaDone): void {
        var data: TacoUtility.Commands.ICommandData = {
            options: {
                local: true
            },
            original: ["android", "ios", "--local"],
            remain: ["android", "ios"]
        };
        Settings.determinePlatform(data).then(function (platforms: Settings.IPlatformWithLocation[]): void {
            platforms.forEach(function (platform: Settings.IPlatformWithLocation): void {
                platform.location.should.equal(Settings.BuildLocationType.Local);
            });
        }).done(function (): void {
            mocha();
        }, mocha);
    });

    it("should correctly report build locations when --remote is specified", function (mocha: MochaDone): void {
        var data: TacoUtility.Commands.ICommandData = {
            options: {
                remote: true
            },
            original: ["android", "ios", "--remote"],
            remain: ["android", "ios"]
        };
        Settings.determinePlatform(data).then(function (platforms: Settings.IPlatformWithLocation[]): void {
            platforms.forEach(function (platform: Settings.IPlatformWithLocation): void {
                platform.location.should.equal(Settings.BuildLocationType.Remote);
            });
        }).done(function (): void {
            mocha();
        }, mocha);
    });

    it("should correctly report build locations when neither --remote nor --local is specified", function (mocha: MochaDone): void {
        var data: TacoUtility.Commands.ICommandData = {
            options: {
            },
            original: ["android", "ios"],
            remain: ["android", "ios"]
        };
        Settings.determinePlatform(data).then(function (platforms: Settings.IPlatformWithLocation[]): void {
            platforms.length.should.equal(2);
            platforms[0].should.eql({ location: Settings.BuildLocationType.Local, platform: "android" });
            platforms[1].should.eql({ location: Settings.BuildLocationType.Remote, platform: "ios" });
        }).done(function (): void {
            mocha();
        }, mocha);
    });

    it("should correctly report build locations when no platforms are specified", function (mocha: MochaDone): void {
        this.timeout(50000);
        var data: TacoUtility.Commands.ICommandData = {
            options: {
            },
            original: [],
            remain: []
        };
        utils.createDirectoryIfNecessary(tacoHome);
        process.chdir(tacoHome);
        Q.denodeify(del)("example").then(function (): Q.Promise<any> {
            return create.run({
                options: {},
                original: ["example"],
                remain: []
            });
        }).then(function (): void {
            process.chdir(path.join(tacoHome, "example"));
            fs.mkdirSync(path.join("platforms", "android"));
        }).then(function (): Q.Promise<any> {
            return Settings.determinePlatform(data);
        }).then(function (platforms: Settings.IPlatformWithLocation[]): void {
            platforms.length.should.equal(2);
            platforms[0].should.eql({ location: Settings.BuildLocationType.Remote, platform: "ios" });
            platforms[1].should.eql({ location: Settings.BuildLocationType.Local, platform: "android" });
        }).done(function (): void {
            mocha();
        }, mocha);
    });
});