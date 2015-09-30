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
/// <reference path="../../typings/rimraf.d.ts" />
/// <reference path="../../typings/cordovaExtensions.d.ts" />

"use strict";

import child_process = require ("child_process");
import fs = require ("fs");
import path = require ("path");
import Q = require ("q");
import rimraf = require ("rimraf");

import Builder = require ("../common/builder");
import plist = require ("./plist");
import resources = require("../resources/resourceManager");
import utils = require ("taco-utils");

import BuildInfo = utils.BuildInfo;
import CordovaConfig = utils.CordovaConfig;
import Logger = utils.Logger;
import TacoPackageLoader = utils.TacoPackageLoader;
import UtilHelper = utils.UtilHelper;

process.on("message", function (buildRequest: { buildInfo: BuildInfo; language: string }): void {
    var buildInfo = BuildInfo.createNewBuildInfoFromDataObject(buildRequest.buildInfo);
    process.env.TACO_LANG = buildRequest.language;
    if (IOSBuilder.running) {
        buildInfo.updateStatus(BuildInfo.ERROR, "BuildInvokedTwice");
        process.send(buildInfo);
        process.exit(1);
    } else {
        IOSBuilder.running = true;
    }

    var cordovaVersion: string = buildInfo["vcordova"];
    buildInfo.updateStatus(BuildInfo.BUILDING, "AcquiringCordova");
    process.send(buildInfo);
    TacoPackageLoader.lazyRequire<Cordova.ICordova>("cordova", "cordova@" + cordovaVersion, buildInfo.logLevel).done(function (pkg: Cordova.ICordova): void {
        var iosBuilder = new IOSBuilder(buildInfo, pkg);

        iosBuilder.build().done(function (resultBuildInfo: BuildInfo): void {
            process.send(resultBuildInfo);
        });
    }, function (err: Error): void {
        buildInfo.updateStatus(BuildInfo.ERROR, "RequireCordovaFailed", cordovaVersion, err.toString());
        process.send(buildInfo);
    });
});

class IOSBuilder extends Builder {
    public static running: boolean = false;
    private cfg: CordovaConfig;

    constructor(currentBuild: BuildInfo, cordova: Cordova.ICordova) {
        super(currentBuild, cordova);

        this.cfg = CordovaConfig.getCordovaConfig(currentBuild.appDir);
    }

    protected beforePrepare(): Q.Promise<any> {
        return Q({});
    }

    protected afterPrepare(): Q.Promise<any> {
        return this.applyPreferencesToBuildConfig(this.cfg);
    }

    protected beforeCompile(): Q.Promise<any> {
        return this.updateAppPlistBuildNumber();
    }

    protected afterCompile(): Q.Promise<any> {
        return this.renameApp();
    }

    protected package(): Q.Promise<any> {
        var deferred = Q.defer();
        var self = this;

        // need quotes around ipa paths for xcrun exec to work if spaces in path
        var appDirName = this.cfg.id() + ".app";
        var ipaFileName = this.currentBuild["appName"] + ".ipa";
        var pathToCordovaApp = UtilHelper.quotesAroundIfNecessary(path.join("platforms", "ios", "build", "device", appDirName));
        var fullPathToIpaFile = UtilHelper.quotesAroundIfNecessary(path.join(process.cwd(), "platforms", "ios", "build", "device", ipaFileName));

        child_process.exec("xcrun -v -sdk iphoneos PackageApplication " + pathToCordovaApp + " -o " + fullPathToIpaFile, {},
            function (error: Error, stdout: Buffer, stderr: Buffer): void {
                Logger.log("xcrun.stdout: " + stdout);
                Logger.log("xcrun.stderr: " + stderr);
                if (error) {
                    deferred.reject(error);
                } else {
                    var plistFileName = self.currentBuild["appName"] + ".plist";
                    var fullPathToPlistFile = path.join(process.cwd(), "platforms", "ios", "build", "device", plistFileName);
                    plist.createEnterprisePlist(self.cfg, fullPathToPlistFile);
                    deferred.resolve({});
                }
            });

        return deferred.promise;
    }

    // Public for unit tests
    public applyPreferencesToBuildConfig(config: CordovaConfig): Q.Promise<any> {
        var promise = Q({});
        var self = this;

        var preferences = config.preferences();

        // Always put the targeted device into the build config.
        // If a valid overriding device is not given, use 'universal'
        var deviceToAdd = "1,2";
        var validOverridingTargetDevices: any = {};
        validOverridingTargetDevices["handset"] = "1";
        validOverridingTargetDevices["tablet"] = "2";

        var targetDevice = preferences["target-device"];
        if (targetDevice && validOverridingTargetDevices[targetDevice]) {
            deviceToAdd = validOverridingTargetDevices[targetDevice];
        }

        promise = promise.then(function (): Q.Promise<any> {
            return self.appendToBuildConfig("TARGETED_DEVICE_FAMILY = " + deviceToAdd);
        });

        var deploymentTarget = preferences["deployment-target"];
        if (deploymentTarget) {
            promise = promise.then(function (): Q.Promise<any> {
                return self.appendToBuildConfig("IPHONEOS_DEPLOYMENT_TARGET = " + deploymentTarget);
            });
        }

        // Ensure we end the line so the config file is in a good state if we try to append things later.
        promise = promise.then(function (): Q.Promise<any> {
            return self.appendToBuildConfig("");
        });

        return promise;
    }

    private appendToBuildConfig(data: string): Q.Promise<any> {
        var deferred = Q.defer();

        var buildConfigDir = path.join("platforms", "ios", "cordova");
        if (!fs.existsSync(buildConfigDir)) {
            deferred.reject(new Error(resources.getString("ErrorXcconfigDirNotFound")));
        } else {
            fs.appendFile(path.join(buildConfigDir, "build.xcconfig"), "\n" + data, function (err: any): void {
                if (err) {
                    deferred.reject(new Error(err));
                } else {
                    deferred.resolve({});
                }
            });
        }

        return deferred.promise;
    }

    private updateAppPlistBuildNumber(): Q.Promise<any> {
        var appPlistFile = path.join("platforms", "ios", this.currentBuild["appName"], this.currentBuild["appName"] + "-Info.plist");
        plist.updateAppBundleVersion(appPlistFile, this.currentBuild.buildNumber);
        return Q({});
    }

    private renameApp(): Q.Promise<any> {
        // We want to make sure that the .app file is named according to the package Id
        // in order to avoid issues with unicode names and to allow us to identify which
        // application to attach to for debugging.
        var deferred = Q.defer();
        var isDeviceBuild = this.currentBuild.options === "--device";
        var oldName = path.join("platforms", "ios", "build", isDeviceBuild ? "device" : "emulator", this.currentBuild["appName"] + ".app");
        var newName = path.join("platforms", "ios", "build", isDeviceBuild ? "device" : "emulator", this.cfg.id() + ".app");

        if (oldName !== newName && fs.existsSync(oldName)) {
            var clearOldData = Q.defer();
            if (fs.existsSync(newName)) {
                rimraf(newName, function (error: Error): void {
                    if (error) {
                        clearOldData.reject(error);
                    } else {
                        clearOldData.resolve({});
                    }
                });
            } else {
                clearOldData.resolve({});
            }

            clearOldData.promise.then(function (): void {
                fs.rename(oldName, newName, function (err: Error): void {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve({});
                    }
                });
            });
        } else {
            deferred.resolve({});
        }

        return deferred.promise;
    }
}
