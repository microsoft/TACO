// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/tacoRemoteLib.d.ts" />
/// <reference path="../../typings/express.d.ts" />
/// <reference path="../../typings/tacoRemoteMultiplexer.d.ts" />
"use strict";

import path = require ("path");
import Q = require ("q");

import tacoUtility = require ("taco-utils");

import BuildInfo = tacoUtility.BuildInfo;
import IPackageSpec = TacoRemoteMultiplexer.IPackageSpec;
import IRemoteLib = TacoRemoteLib.IRemoteLib;
import TacoError = tacoUtility.TacoError;
import TacoErrorCode = tacoUtility.TacoErrorCode;
import TacoPackageLoader = tacoUtility.TacoPackageLoader;
import ITacoRemoteMultiplexer = TacoRemoteMultiplexer.ITacoRemoteMultiplexer;

var dynamicDependenciesLocation: string = path.join(__dirname, "../dynamicDependencies.json");
var tacoRemoteMux: string = "taco-remote-multiplexer";

class RequestRedirector implements TacoRemoteLib.IRequestRedirector {
    public getPackageToServeRequest(req: Express.Request): Q.Promise<IRemoteLib> {
        return TacoPackageLoader.lazyTacoRequire<ITacoRemoteMultiplexer>(tacoRemoteMux, dynamicDependenciesLocation)
            .then(function (mux: ITacoRemoteMultiplexer): Q.Promise<IRemoteLib> {
                var packageSpec: IPackageSpec = mux.getPackageSpecForQuery(req.query);
                return TacoPackageLoader.lazyTacoRequire<IRemoteLib>(packageSpec.packageKey, packageSpec.dependencyConfigPath);
            })
            .catch(function (err: any): IRemoteLib {
                err.code = 500;
                throw err;
            });
    }
}

var instance: TacoRemoteLib.IRequestRedirector = new RequestRedirector();
export = instance;
