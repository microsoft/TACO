/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/tacoRemoteLib.d.ts" />
/// <reference path="../../typings/express.d.ts" />
/// <reference path="../../typings/tacoRemoteMultiplexer.d.ts" />
"use strict";

import Q = require ("q");

import tacoUtility = require ("taco-utils");

import BuildInfo = tacoUtility.BuildInfo;
import TacoPackageLoader = tacoUtility.TacoPackageLoader;

var tacoMuxLocation = require("./tacoRemoteMuxLocation.json");

var lastCheck = Date.now();

class RequestRedirector implements TacoRemoteLib.IRequestRedirector {
    // Update every 4 hours
    public static checkInterval = 4 * 60 * 60 * 1000;

    public getPackageToServeRequest(req: Express.Request): Q.Promise<TacoRemoteLib.IRemoteLib> {
        var promise = Q({});
        var now = Date.now();
        if (now - lastCheck > RequestRedirector.checkInterval) {
            lastCheck = now;
            promise = TacoPackageLoader.forceInstallPackage(tacoMuxLocation.name, tacoMuxLocation.location, { basePath: __dirname });
        }
        return promise.then(function () {
            return TacoPackageLoader.lazyRequireNoCache<TacoRemoteMultiplexer>(tacoMuxLocation.name, tacoMuxLocation.location, { basePath: __dirname }).then(function (mux: TacoRemoteMultiplexer): Q.Promise<TacoRemoteLib.IRemoteLib> {
                var pkgLocation = mux.getPackage(req.query);
                return TacoPackageLoader.lazyRequireNoCache<TacoRemoteLib.IRemoteLib>(pkgLocation.name, pkgLocation.location, { basePath: __dirname });
            });
        });
    }
}

var instance: TacoRemoteLib.IRequestRedirector = new RequestRedirector();

export = instance;