/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/Q.d.ts" />
/// <reference path="../../typings/tacoUtils.d.ts" />
"use strict";

import child_process = require ("child_process");
import path = require ("path");
import Q = require ("q");
import util = require ("util");

import tacoUtils = require ("taco-utils");
import utils = tacoUtils.UtilHelper;
import BuildInfo = tacoUtils.BuildInfo;

// Note: this file is not intended to be loaded as a module, but rather in a separate process.
process.on("message", function (emulateRequest: { appDir: string; appName: string; target: string }): void {
    Q(IOSEmulate.emulate(emulateRequest))
        .then(function (result: { status: string; messageId: string; messageArgs?: any }): void {
        process.send(result);
    }).done();
});

class IOSEmulate {
    private static IOSSimTargets: { [id: string]: string } = {
        "iphone 4s": "--retina",
        "iphone 5": "--retina --tall",
        "iphone 5s": "--retina --tall --64bit",
        "iphone 6": "--devicetypeid com.apple.CoreSimulator.SimDeviceType.iPhone-6",
        "iphone 6 plus": "--devicetypeid com.apple.CoreSimulator.SimDeviceType.iPhone-6-Plus",
        "ipad 2": "--family ipad",
        "ipad air": "--family ipad --retina --64bit",
        "ipad retina": "--family ipad --retina"
    };

    public static emulate(emulateRequest: { appDir: string; appName: string; target: string }): Q.Promise<{ status: string; messageId: string; messageArgs?: any }> {
        return Q.fcall(IOSEmulate.cdToAppDir, emulateRequest)
            .then(IOSEmulate.cordovaEmulate.bind(IOSEmulate, emulateRequest))
            .then(function success(): { status: string; messageId: string; messageArgs?: any } {
            return { status: BuildInfo.EMULATED, messageId: "EmulateSuccess" };
        }, function fail(e: Error): { status: string; messageId: string; messageArgs?: any } {
                return { status: "error", messageId: "EmulateFailedWithError", messageArgs: e.message };
            });
    }

    private static cdToAppDir(appDir: string): void {
        process.chdir(appDir);
    }

    private static cordovaEmulate(emulateRequest: { appDir: string; appName: string; target: string }): Q.Promise<{}> {
        var deferred = Q.defer();
        var emulatorAppPath = utils.quotesAroundIfNecessary(path.join(emulateRequest.appDir, "platforms", "ios", "build", "emulator", emulateRequest.appName + ".app"));
        utils.loggedExec(util.format("ios-sim launch %s %s --exit", emulatorAppPath, IOSEmulate.iosSimTarget(emulateRequest.target)), {}, function (error: Error, stdout: Buffer, stderr: Buffer): void {
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve({});
            }
        });
        return deferred.promise;
    }

    private static iosSimTarget(emulateRequestTarget: string): string {
        emulateRequestTarget = emulateRequestTarget.toLowerCase();
        var iosSimTarget = IOSEmulate.IOSSimTargets[emulateRequestTarget] || "--family iphone --retina";
        return iosSimTarget;
    }
}