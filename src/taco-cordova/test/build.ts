/// <reference path="../../typings/mocha.d.ts" />

import express = require ("express");
import http = require ("http");
import nconf = require ("nconf");
import os = require ("os");
import path = require ("path");
import TacoCordova = require ("../lib/server");
import TacoUtils = require ("taco-utils");
import UtilHelper = TacoUtils.UtilHelper;
import selftest = require ("../lib/selftest");

var macOnlyIt = os.platform() === "darwin" ? it : it.skip;

describe("taco-cordova", function (): void {
    var server: http.Server;
    var serverMod: TacoRemote.IServerModule;
    var downloadDir = path.join(__dirname, "out", "selftest");
    var modMountPoint = "Test";
    before(function (mocha: MochaDone): void {
        var app = express();
        var serverDir = path.join(__dirname, "out");
        UtilHelper.createDirectoryIfNecessary(serverDir);
        UtilHelper.createDirectoryIfNecessary(downloadDir);
        nconf.defaults({
            serverDir: serverDir,
            port: 3000,
            secure: false,
            modules: {
                "taco-cordova": {
                    mountPoint: modMountPoint
                }
            }
        }).use("memory");

        TacoCordova.create(nconf, modMountPoint, {}).then(function (serverModule: TacoRemote.IServerModule): void {
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
        this.timeout(30000);
        var server = "http://" + os.hostname() + ":3000";
        selftest.test(server, modMountPoint, downloadDir).done(function (): void {
            mocha();
        }, mocha);
    });
});