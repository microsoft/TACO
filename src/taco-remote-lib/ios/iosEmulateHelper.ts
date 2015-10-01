/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
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
    Q(IOSEmulateHelper.emulate(emulateRequest))
        .then(function (result: { status: string; messageId: string; messageArgs?: any }): void {
        process.send(result);
    }).done();
});

class IOSEmulateHelper {
    private static IOS_SIMULATOR_TARGETS: { [id: string]: string } = {
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
        return Q.fcall(IOSEmulateHelper.cdToAppDir, emulateRequest.appDir)
        .then(function (): Q.Promise<{}> { return IOSEmulateHelper.cordovaEmulate(emulateRequest); })
        .then(function success(): { status: string; messageId: string; messageArgs?: any } {
            return { status: BuildInfo.EMULATED, messageId: "EmulateSuccess" };
        }, function fail(e: any): { status: string; messageId: string; messageArgs?: any } {
            if (e.status) {
                return e;
            } else {
                return { status: "error", messageId: "EmulateFailedWithError", messageArgs: e.message };
            }
        });
    }

    private static cdToAppDir(appDir: string): void {
        process.chdir(appDir);
    }

    private static cordovaEmulate(emulateRequest: { appDir: string; appName: string; target: string }): Q.Promise<{}> {
        var deferred = Q.defer();
        var emulatorAppPath = utils.quotesAroundIfNecessary(path.join(emulateRequest.appDir, "platforms", "ios", "build", "emulator", emulateRequest.appName + ".app"));
        var emulatorProcess = utils.loggedExec(util.format("ios-sim launch %s %s --exit", emulatorAppPath, IOSEmulateHelper.iosSimTarget(emulateRequest.target)), {}, function (error: Error, stdout: Buffer, stderr: Buffer): void {
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve({});
            }
        });
        // When run via SSH / without a GUI, ios-sim can hang indefinitely. A cold launch can take on the order of 5 seconds.
        var emulatorTimeout = setTimeout(function (): void {
            emulatorProcess.kill();
            deferred.reject({ status: "error", messageId: "EmulateFailedTimeout" });
        }, 10000);

        return deferred.promise.finally(function (): void {
            clearTimeout(emulatorTimeout);
        });
    }

    private static iosSimTarget(emulateRequestTarget: string): string {
        emulateRequestTarget = emulateRequestTarget.toLowerCase();
        var iosSimTarget = IOSEmulateHelper.IOS_SIMULATOR_TARGETS[emulateRequestTarget] || "--family iphone --retina";
        return iosSimTarget;
    }
}
