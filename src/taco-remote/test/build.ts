/// <reference path="../../typings/mocha.d.ts" />

import express = require ("express");
import fs = require ("fs");
import http = require ("http");
import nconf = require ("nconf");
import os = require ("os");
import path = require ("path");
import TacoRemote = require ("../lib/server");
import TacoUtils = require ("taco-utils");
import UtilHelper = TacoUtils.UtilHelper;
import resources = TacoUtils.ResourcesManager;
import selftest = require ("../lib/selftest");

var macOnlyIt = os.platform() === "darwin" ? it : it.skip;

describe("taco-remote", function (): void {
    var server: http.Server;
    var serverMod: RemoteBuild.IServerModule;
    var downloadDir = path.join(__dirname, "out", "selftest");
    var modMountPoint = "Test";
    before(function (mocha: MochaDone): void {
        resources.init("en", path.join(__dirname, "..", "resources"));
        resources.UnitTest = true;
        process.env["TACO_HOME"] = path.join(__dirname, "out");
        UtilHelper.createDirectoryIfNecessary(UtilHelper.tacoHome);
        var firstRunPath = path.join(UtilHelper.tacoHome, ".taco-remote");
        fs.writeFileSync(firstRunPath, ""); // Just need the file to exist so the test doesn't try to ask us about installing homebrew

        var app = express();
        var serverDir = path.join(__dirname, "out");
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