/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/Q.d.ts" />
/// <reference path="../../../typings/cordovaExtensions.d.ts" />

"use strict";

import child_process = require ("child_process");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import util = require ("util");

import cordovaHelper = require ("./cordovaHelper");
import resources = require ("../../resources/resourceManager");
import TacoErrorCodes = require ("../tacoErrorCodes");
import errorHelper = require ("../tacoErrorHelper");
import tacoUtility = require ("taco-utils");

import packageLoader = tacoUtility.TacoPackageLoader;

class CordovaWrapper {
    private static CordovaCommandName: string = os.platform() === "win32" ? "cordova.cmd" : "cordova";
    private static CordovaNpmPackageName: string = "cordova";

    public static cli(args: string[]): Q.Promise<any> {
        var deferred = Q.defer();
        var proc = child_process.spawn(CordovaWrapper.CordovaCommandName, args, { stdio: "inherit" });
        proc.on("error", function (err: any): void {  
            // ENOENT error thrown if no Cordova.cmd is found
            if (err.code == "ENOENT") {
                tacoUtility.Logger.logErrorLine(resources.getString("CordovaCmdNotFound"));
                deferred.resolve({});
            }

            deferred.reject(errorHelper.wrap(TacoErrorCodes.CordovaCommandFailedWithError, err, args.join(" ")));
        });
        proc.on("close", function (code: number): void {
            if (code) {
                deferred.reject(errorHelper.get(TacoErrorCodes.CordovaCommandFailed, code, args.join(" ")));
            } else {
                deferred.resolve({});
            }
        });
        return deferred.promise;
    }

    public static build(platform: string): Q.Promise<any> {
        return CordovaWrapper.cli(["build", platform]);
    }

    public static run(platform: string): Q.Promise<any> {
        return CordovaWrapper.cli(["run", platform]);
    }

    /**
     * Wrapper for 'cordova create' command.
     *
     * @param {string} The version of the cordova CLI to use
     * @param {ICordovaCreateParameters} The cordova create options
     *
     * @return {Q.Promise<any>} An empty promise
     */
    public static create(cordovaCliVersion: string, cordovaParameters: cordovaHelper.ICordovaCreateParameters): Q.Promise<any> {
        return packageLoader.lazyRequire(CordovaWrapper.CordovaNpmPackageName, cordovaCliVersion)
            .then(function (cordova: Cordova.ICordova): Q.Promise<any> {
                cordovaHelper.prepareCordovaConfig(cordovaParameters);

                return cordova.raw.create(cordovaParameters.projectPath, cordovaParameters.appId, cordovaParameters.appName, cordovaParameters.cordovaConfig);
            });
    }
}

export = CordovaWrapper;
