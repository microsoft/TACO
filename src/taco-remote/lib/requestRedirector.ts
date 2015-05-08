/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

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
    public static CheckInterval = 4 * 60 * 60 * 1000;

    public getPackageToServeRequest(req: Express.Request): Q.Promise<TacoRemoteLib.IRemoteLib> {
        var promise = Q({});
        var now = Date.now();
        if (now - lastCheck > RequestRedirector.CheckInterval) {
            lastCheck = now;
            promise = TacoPackageLoader.forceInstallPackage(tacoMuxLocation.name, tacoMuxLocation.location, { basePath: __dirname });
        }

        return promise.then(function (): Q.Promise<TacoRemoteLib.IRemoteLib> {
            return TacoPackageLoader.lazyRequireNoCache<TacoRemoteMultiplexer.ITacoRemoteMultiplexer>(tacoMuxLocation.name, tacoMuxLocation.location, { basePath: __dirname }).then(function (mux: TacoRemoteMultiplexer.ITacoRemoteMultiplexer): Q.Promise<TacoRemoteLib.IRemoteLib> {
                var pkgLocation = mux.getPackage(req.query);
                return TacoPackageLoader.lazyRequireNoCache<TacoRemoteLib.IRemoteLib>(pkgLocation.name, pkgLocation.location, { basePath: __dirname });
            });
        });
    }
}

var instance: TacoRemoteLib.IRequestRedirector = new RequestRedirector();

export = instance;
