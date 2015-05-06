/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/tacoRemoteLib.d.ts" />

import express = require ("express");
import Q = require ("q");

import tacoUtility = require ("taco-utils");

import BuildInfo = tacoUtility.BuildInfo;

class RequestRedirector implements TacoRemoteLib.IRequestRedirector {
    public getPackageToServeRequest(buildInfo: BuildInfo, req: express.Request): Q.Promise<TacoRemoteLib.IRemoteLib> {
        // Either argument could be null: buildInfo if this is a request to submit a new build, or req if this is just about to do a build
        // ALTERNATELY:
        // Should we just look up the package to service a request once, based on the request, and then stash it in the buildInfo for later reference? Never letting you change?
        // In that case we would need to be careful when updating buildInfo objects from responses in other processes but that should be workable.
        // TODO (Devdiv 1160580): Implement interesting behaviours in here
        return Q(require("taco-remote-lib"));
    }
}

var instance: TacoRemoteLib.IRequestRedirector = new RequestRedirector();

export = instance;