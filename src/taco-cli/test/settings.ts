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

import cordova = require ("cordova");
import del = require ("del");
import fs = require ("fs");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import rimraf = require ("rimraf");

import resources = require ("../resources/resourceManager");
import Settings = require ("../cli/utils/settings");
import SetupMock = require ("./utils/setupMock");
import TacoUtility = require ("taco-utils");

import utils = TacoUtility.UtilHelper;

describe("taco settings", function (): void {
    var tacoHome = path.join(os.tmpdir(), "taco-cli", "settings");

    before(function (mocha: MochaDone): void {
        // Set up mocked out resources
        process.env["TACO_UNIT_TEST"] = true;
        // Use a dummy home location so we don't trash any real configurations
        process.env["TACO_HOME"] = tacoHome;
        // Configure a dummy platform "test" to use the mocked out remote server
        SetupMock.saveConfig("test", { host: "localhost", port: 3000, secure: false, mountPoint: "cordova" }).done(function (): void {
            mocha();
        }, function (err: any): void {
            mocha(err);
        });
    });

    after(function (): void {
        rimraf(tacoHome, function (err: Error): void {/* ignored */ }); // Not sync, and ignore errors
    });

    it("should correctly report build locations when --local is specified", function (mocha: MochaDone): void {
        var data: TacoUtility.Commands.ICommandData = {
            options: {
                local: true
            },
            original: ["foo", "test", "--local"],
            remain: ["foo", "test"]
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
            original: ["foo", "test", "--remote"],
            remain: ["foo", "test"]
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
            original: ["foo", "test"],
            remain: ["foo", "test"]
        };
        Settings.determinePlatform(data).then(function (platforms: Settings.IPlatformWithLocation[]): void {
            platforms[0].location.should.equal(Settings.BuildLocationType.Local);
            platforms[1].location.should.equal(Settings.BuildLocationType.Remote);
        }).done(function (): void {
            mocha();
        }, mocha);
    });

    it("should correctly report build locations when no platforms are specified", function (mocha: MochaDone): void {
        var data: TacoUtility.Commands.ICommandData = {
            options: {
            },
            original: [],
            remain: []
        };
        utils.createDirectoryIfNecessary(tacoHome);
        process.chdir(tacoHome);
        Q.denodeify(del)("example").then(function (): Q.Promise<any> {
            return cordova.raw.create("example");
        }).then(function (): void {
            process.chdir(path.join(tacoHome, "example"));
            fs.mkdirSync(path.join("platforms", "foo"));
        }).then(function (): Q.Promise<any> {
            return Settings.determinePlatform(data);
        }).then(function (platforms: Settings.IPlatformWithLocation[]): void {
            platforms.length.should.equal(2);
            platforms[0].should.eql({ location: Settings.BuildLocationType.Remote, platform: "test" });
            platforms[1].should.eql({ location: Settings.BuildLocationType.Local, platform: "foo" });
        }).done(function (): void {
            mocha();
        }, mocha);
    });
});