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

/* tslint:disable:no-var-requires */
// var require needed for should module to work correctly
// Note not import: We don't want to refer to shouldModule, but we need the require to occur since it modifies the prototype of Object.
var shouldModule: any = require("should");
/* tslint:enable:no-var-requires */

import del = require ("del");
import fs = require ("fs");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import rimraf = require ("rimraf");

import kitHelper = require ("../cli/utils/kitHelper");
import resources = require ("../resources/resourceManager");
import PlatformHelper = require ("../cli/utils/platformHelper");
import RemoteMock = require ("./utils/remoteMock");
import TacoUtility = require ("taco-utils");
import CommandHelper = require ("./utils/commandHelper");
import ICommand = TacoUtility.Commands.ICommand;

import utils = TacoUtility.UtilHelper;

var create: ICommand = CommandHelper.getCommand("create");
describe("taco PlatformHelper", function (): void {
    var tacoHome: string = path.join(os.tmpdir(), "taco-cli", "PlatformHelper");
    var originalCwd: string;

    before(function (mocha: MochaDone): void {
        originalCwd = process.cwd();
        // Set up mocked out resources
        process.env["TACO_UNIT_TEST"] = true;
        // Use a dummy home location so we don't trash any real configurations
        process.env["TACO_HOME"] = tacoHome;
        // Force KitHelper to fetch the package fresh
        kitHelper.kitPackagePromise = null;
        // Configure a dummy platform "test" to use the mocked out remote server
        RemoteMock.saveConfig("ios", { host: "localhost", port: 3000, secure: false, mountPoint: "cordova" }).done(function (): void {
            mocha();
        }, function (err: any): void {
            mocha(err);
        });
    });

    after(function (done: MochaDone): void {
        process.chdir(originalCwd);
        kitHelper.kitPackagePromise = null;
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
        PlatformHelper.determinePlatform(data).then(function (platforms: PlatformHelper.IPlatformWithLocation[]): void {
            platforms.forEach(function (platform: PlatformHelper.IPlatformWithLocation): void {
                platform.location.should.equal(PlatformHelper.BuildLocationType.Local);
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
        PlatformHelper.determinePlatform(data).then(function (platforms: PlatformHelper.IPlatformWithLocation[]): void {
            platforms.forEach(function (platform: PlatformHelper.IPlatformWithLocation): void {
                platform.location.should.equal(PlatformHelper.BuildLocationType.Remote);
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
        PlatformHelper.determinePlatform(data).then(function (platforms: PlatformHelper.IPlatformWithLocation[]): void {
            platforms.length.should.equal(2);
            platforms[0].should.eql({ location: PlatformHelper.BuildLocationType.Local, platform: "android" });
            platforms[1].should.eql({ location: PlatformHelper.BuildLocationType.Remote, platform: "ios" });
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
            return create.run(["example"]);
        }).then(function (): void {
            process.chdir(path.join(tacoHome, "example"));
            fs.mkdirSync(path.join("platforms", "android"));
        }).then(function (): Q.Promise<any> {
            return PlatformHelper.determinePlatform(data);
        }).then(function (platforms: PlatformHelper.IPlatformWithLocation[]): void {
            platforms.length.should.equal(2);
            platforms[0].should.eql({ location: PlatformHelper.BuildLocationType.Remote, platform: "ios" });
            platforms[1].should.eql({ location: PlatformHelper.BuildLocationType.Local, platform: "android" });
        }).done(function (): void {
            mocha();
        }, mocha);
    });
});
