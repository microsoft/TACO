/// <reference path="../../typings/mocha.d.ts" />

import express = require ("express");
import fs = require ("fs");
import http = require ("http");
import expressLogger = require ("morgan");
import nconf = require ("nconf");
import os = require ("os");
import path = require ("path");
import rimraf = require ("rimraf");

import selftest = require ("../lib/selftest");
import TacoRemote = require ("../lib/server");
import TacoUtils = require ("taco-utils");

import UtilHelper = TacoUtils.UtilHelper;

var macOnlyIt: (expectation: string, assertion?: (mocha? : MochaDone) => void) => void = os.platform() === "darwin" ? it : it.skip;

describe("taco-remote", function(): void {
    var server: http.Server;
    var serverMod: RemoteBuild.IServerModule;
    var serverDir: string = path.join(os.tmpdir(), "taco-remote", "build");
    var downloadDir: string = path.join(serverDir, "selftest");
    var modMountPoint: string = "Test";

    before(function(mocha: MochaDone): void {
        process.env["TACO_UNIT_TEST"] = true;
        process.env["TACO_HOME"] = serverDir;
        rimraf.sync(UtilHelper.tacoHome);
        UtilHelper.createDirectoryIfNecessary(UtilHelper.tacoHome);
        var firstRunPath: string = path.join(UtilHelper.tacoHome, ".taco-remote");
        fs.writeFileSync(firstRunPath, ""); // Just need the file to exist so the test doesn't try to ask us about installing homebrew

        var app: express.Express = express();
        app.use(expressLogger("dev"));
        UtilHelper.createDirectoryIfNecessary(serverDir);
        UtilHelper.createDirectoryIfNecessary(downloadDir);
        var serverConfig: any = {
            serverDir: serverDir,
            port: 3000,
            secure: false,
            lang: "en",
            hostname: os.hostname()
        };

        var modConfig: RemoteBuild.IServerModuleConfiguration = {
            mountPath: modMountPoint
        };

        TacoRemote.create(serverConfig, modConfig, {}).then(function(serverModule: RemoteBuild.IServerModule): void {
            serverMod = serverModule;

            app.use("/" + modMountPoint, serverModule.getRouter());

            server = http.createServer(app);
            server.listen(3000, mocha);
        }).fail(mocha);
    });

    after(function(mocha: MochaDone): void {
        if (serverMod) {
            serverMod.shutdown();
        }

        server.close(mocha);
        rimraf(serverDir, function(err: Error): void {/* ignored */ }); // Not sync, and ignore errors
    });

    macOnlyIt("should successfully build the sample project", function(mocha: MochaDone): void {
        // Building can take a while
        this.timeout(60000);
        var serverUrl: string = "http://" + os.hostname() + ":3000";
        selftest.test(serverUrl, modMountPoint, downloadDir, false, null).done(function(): void {
            mocha();
        }, mocha);
    });

    // Note: This test will fail unless it is run from a GUI login, or the user running the test has jumped through some hoops to allow the "codesign" program access to the keychain
    it.skip("should successfully build the sample project for device", function(mocha: MochaDone): void {
        // Building can take a while
        this.timeout(60000);
        var serverUrl: string = "http://" + os.hostname() + ":3000";
        selftest.test(serverUrl, modMountPoint, downloadDir, true, null).done(function(): void {
            mocha();
        }, mocha);
    });
});
