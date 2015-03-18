/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/Q.d.ts" />
/// <reference path="../../typings/taco-utils.d.ts" />
"use strict";

import child_process = require ("child_process");
import path = require ("path");
import Q = require ("q");

import tacoUtils = require ("taco-utils");
import utils = tacoUtils.UtilHelper;
// Note: this file is not intended to be loaded as a module, but rather in a separate process.
process.on("message", function (emulateRequest: any): void {
    Q(emulate(emulateRequest))
        .then(function (result: { status: string; messageId: string; messageArgs?: any }): void {
        process.send(result);
    }).done();
});

function emulate(emulateRequest: { appDir: string; appName: string; target: string }): Q.Promise<{ status: string; messageId: string; messageArgs?: any }> {
    return Q.fcall(cdToAppDir, emulateRequest)
        .then(cordovaEmulate)
        .then(function success(): { status: string; messageId: string; messageArgs?: any } {
        return { status: "emulated", messageId: "EmulateSuccess" };
    }, function fail(e: Error): { status: string; messageId: string; messageArgs?: any } {
            return { status: "error", messageId: "EmulateFailedWithError", messageArgs: e.message };
        });
}

function cdToAppDir(emulateRequest: { appDir: string; appName: string; target: string }): { appDir: string; appName: string; target: string } {
    process.chdir(emulateRequest.appDir);
    return emulateRequest;
}

function cordovaEmulate(emulateRequest: { appDir: string; appName: string; target: string }): Q.Promise<{}> {
    var deferred = Q.defer();
    var emulatorAppPath = utils.quotesAroundIfNecessary(path.join(emulateRequest.appDir, "platforms", "ios", "build", "emulator", emulateRequest.appName + ".app"));
    utils.loggedExec("ios-sim launch " + emulatorAppPath + " " + iosSimTarget(emulateRequest.target) + " --exit", {}, function (error: Error, stdout: Buffer, stderr: Buffer): void {
        if (error) {
            deferred.reject(error);
        } else {
            deferred.resolve({});
        }
    });
    return deferred.promise;
}

var iosSimTargets: { [id: string]: string } = {
    "iphone 4s": "--retina",
    "iphone 5": "--retina --tall",
    "iphone 5s": "--retina --tall --64bit",
    "iphone 6": "--devicetypeid com.apple.CoreSimulator.SimDeviceType.iPhone-6",
    "iphone 6 plus": "--devicetypeid com.apple.CoreSimulator.SimDeviceType.iPhone-6-Plus",
    "ipad 2": "--family ipad",
    "ipad air": "--family ipad --retina --64bit",
    "ipad retina": "--family ipad --retina"
};

function iosSimTarget(emulateRequestTarget: string): string {
    emulateRequestTarget = emulateRequestTarget.toLowerCase();
    var iosSimTarget = iosSimTargets[emulateRequestTarget] || "--family iphone --retina";
    return iosSimTarget;
}