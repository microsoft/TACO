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

var dynamicDependenciesLocation = require.resolve("../dynamicDependencies.json");
var tacoRemoteMux = "taco-remote-multiplexer";

var lastCheck = Date.now();

class RequestRedirector implements TacoRemoteLib.IRequestRedirector {
    // Update every 4 hours by default, but tests can change this to force updates
    public checkInterval = 4 * 60 * 60 * 1000;

    public getPackageToServeRequest(req: Express.Request): Q.Promise<TacoRemoteLib.IRemoteLib> {
        var promise = Q({});
        var now = Date.now();
        if (now - lastCheck > this.checkInterval) {
            lastCheck = now;
            promise = TacoPackageLoader.forceInstallTacoPackage(tacoRemoteMux, dynamicDependenciesLocation);
        }

        return promise.then(function (): Q.Promise<TacoRemoteLib.IRemoteLib> {
            return TacoPackageLoader.tacoRequireNoCache<TacoRemoteMultiplexer.ITacoRemoteMultiplexer>(tacoRemoteMux, dynamicDependenciesLocation).then(function (mux: TacoRemoteMultiplexer.ITacoRemoteMultiplexer): Q.Promise<TacoRemoteLib.IRemoteLib> {
                var packageInfo = mux.getPackageSpecForQuery(req.query);
                return TacoPackageLoader.lazyRequire<TacoRemoteLib.IRemoteLib>(packageInfo.name, packageInfo.location);
            });
        });
    }
}

var instance: TacoRemoteLib.IRequestRedirector = new RequestRedirector();

export = instance;
