/// <reference path="../../typings/mocha.d.ts" />

import express = require ("express");
import fs = require ("fs");
import http = require("http");
import expressLogger = require("morgan");
import nconf = require ("nconf");
import os = require ("os");
import path = require ("path");
import rimraf = require ("rimraf");

import resources = require ("../resources/resourceManager");
import selftest = require ("../lib/selftest");
import TacoRemote = require ("../lib/server");
import TacoUtils = require ("taco-utils");

import UtilHelper = TacoUtils.UtilHelper;

var macOnlyIt = os.platform() === "darwin" ? it : it.skip;

describe("taco-remote", function (): void {
    var server: http.Server;
    var serverMod: RemoteBuild.IServerModule;
    var serverDir = path.join(os.tmpdir(), "taco-remote", "build");
    var downloadDir = path.join(serverDir, "selftest");
    var modMountPoint = "Test";
    var resources: TacoUtils.ResourceManager = null;
    before(function (mocha: MochaDone): void {
        resources = new TacoUtils.ResourceManager(path.join(__dirname, "..", "resources"), "en");
        process.env["TACO_UNIT_TEST"] = true;
        process.env["TACO_HOME"] = serverDir;
        UtilHelper.createDirectoryIfNecessary(UtilHelper.tacoHome);
        var firstRunPath = path.join(UtilHelper.tacoHome, ".taco-remote");
        fs.writeFileSync(firstRunPath, ""); // Just need the file to exist so the test doesn't try to ask us about installing homebrew

        var app = express();
        app.use(expressLogger("dev"));
        UtilHelper.createDirectoryIfNecessary(serverDir);
        UtilHelper.createDirectoryIfNecessary(downloadDir);
        var serverConfig = {
            serverDir: serverDir,
            port: 3000,
            secure: false,
            lang: "en",
            hostname: os.hostname()
        };

        var modConfig: RemoteBuild.IServerModuleConfiguration = {
            mountPath: modMountPoint
        };

        TacoRemote.create(serverConfig, modConfig, {}).then(function (serverModule: RemoteBuild.IServerModule): void {
            serverMod = serverModule;

            app.use("/" + modMountPoint, serverModule.getRouter());

            server = http.createServer(app);
            server.listen(3000, mocha);
        }).fail(mocha);
    });

    after(function (mocha: MochaDone): void {
        if (serverMod) {
            serverMod.shutdown();
        }

        server.close(mocha);
        rimraf(serverDir, function (err: Error): void {/* ignored */ }); // Not sync, and ignore errors
    });

    macOnlyIt("should successfully build the sample project", function (mocha: MochaDone): void {
        // Building can take a while
        this.timeout(60000);
        var server = "http://" + os.hostname() + ":3000";
        selftest.test(server, modMountPoint, downloadDir, false, null).done(function (): void {
            mocha();
        }, mocha);
    });

    // Note: This test will fail unless it is run from a GUI login, or the user running the test has jumped through some hoops to allow the "codesign" program access to the keychain
    it.skip("should successfully build the sample project for device", function (mocha: MochaDone): void {
        // Building can take a while
        this.timeout(60000);
        var server = "http://" + os.hostname() + ":3000";
        selftest.test(server, modMountPoint, downloadDir, true, null).done(function (): void {
            mocha();
        }, mocha);
    });
});