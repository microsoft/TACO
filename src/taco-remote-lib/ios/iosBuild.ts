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

import plist = require ("./plist");
import resources = require ("../resources/resourceManager");
import utils = require ("taco-utils");

import BuildInfo = utils.BuildInfo;
import CordovaConfig = utils.CordovaConfig;
import TacoPackageLoader = utils.TacoPackageLoader;
import UtilHelper = utils.UtilHelper;

var cordova: Cordova.ICordova = null;

function beforePrepare(data: any): void {
    // Instead of a build, we call prepare and then compile
    // trigger the before_build in case users expect it
    cordova.emit("before_build", data);
}

function afterCompile(data: any): void {
    // Instead of a build, we call prepare and then compile
    // trigger the after_build in case users expect it
    cordova.emit("after_build", data);
}

// This file is only imported via modules in tests, and is invoked in a new process in normal execution.
// All stderr/stdout messages are captured by the parent process and logged to a file.
var currentBuild: BuildInfo = null;
var cfg: CordovaConfig = null;
var language: string = null;

process.on("message", function (buildRequest: { buildInfo: BuildInfo; language: string }): void {
    var buildInfo = BuildInfo.createNewBuildInfoFromDataObject(buildRequest.buildInfo);
    if (currentBuild) {
        buildInfo.updateStatus(BuildInfo.ERROR, "BuildInvokedTwice");
        process.send(buildInfo);
        process.exit(1);
    }

    currentBuild = buildInfo;
    language = buildRequest.language;
    var cordovaVersion: string = currentBuild["vcordova"];
    buildInfo.updateStatus(BuildInfo.BUILDING, "AcquiringCordova");
    process.send(buildInfo);
    TacoPackageLoader.lazyRequire<Cordova.ICordova>("cordova", cordovaVersion, buildInfo.logLevel).done(function (pkg: Cordova.ICordova): void {
        cordova = pkg;

        cordova.on("results", console.info);
        cordova.on("log", console.info);
        cordova.on("warn", console.warn);
        cordova.on("error", console.error);
        cordova.on("verbose", console.info);
        cordova.on("before_prepare", beforePrepare);
        cordova.on("after_compile", afterCompile);

        IOSBuildHelper.build(buildInfo, function (resultBuildInfo: BuildInfo): void {
            process.send(resultBuildInfo);
        });
    }, function (err: Error): void {
            buildInfo.updateStatus(BuildInfo.ERROR, "RequireCordovaFailed", cordovaVersion, err.toString())
            process.send(buildInfo);
    });
});

class IOSBuildHelper {
    public static build(currentBuild: BuildInfo, callback: Function): void {
        cfg = CordovaConfig.getCordovaConfig(currentBuild.appDir);

        var noOp: () => void = function (): void { };
        var isDeviceBuild = currentBuild.options.indexOf("--device") !== -1;

        try {
            Q.fcall(IOSBuildHelper.change_directory, currentBuild)
                .then(function (): void { currentBuild.updateStatus(BuildInfo.BUILDING, "UpdatingIOSPlatform"); process.send(currentBuild); })
                .then(IOSBuildHelper.addOrPrepareIOS)
                .then(function (): void { IOSBuildHelper.applyPreferencesToBuildConfig(cfg); })
                .then(function (): void { currentBuild.updateStatus(BuildInfo.BUILDING, "CopyingNativeOverrides"); process.send(currentBuild); })
                .then(IOSBuildHelper.prepareNativeOverrides)
                .then(IOSBuildHelper.updateAppPlistBuildNumber)
                .then(function (): void { currentBuild.updateStatus(BuildInfo.BUILDING, "CordovaCompiling"); process.send(currentBuild); })
                .then(IOSBuildHelper.build_ios)
                .then(IOSBuildHelper.rename_app)
                .then(function (): void { currentBuild.updateStatus(BuildInfo.BUILDING, "PackagingNativeApp"); process.send(currentBuild); })
                .then(isDeviceBuild ? IOSBuildHelper.package_ios : noOp)
                .then(function (): void {
                console.info(resources.getString("DoneBuilding", currentBuild.buildNumber));
                currentBuild.updateStatus(BuildInfo.COMPLETE);
            })
                .catch(function (err: Error): void {
                console.info(resources.getString("ErrorBuilding", currentBuild.buildNumber, err.message));
                currentBuild.updateStatus(BuildInfo.ERROR, "BuildFailedWithError", err.message);
            })
                .done(function (): void {
                callback(currentBuild);
            });
        } catch (e) {
            currentBuild.updateStatus(BuildInfo.ERROR, "BuildFailedWithError", e.message);
            callback(currentBuild);
        }
    }

    // Public for unit tests
    public static applyPreferencesToBuildConfig(config: CordovaConfig): Q.Promise<any> {
        var promise = Q({});

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
            return IOSBuildHelper.appendToBuildConfig("TARGETED_DEVICE_FAMILY = " + deviceToAdd);
        });

        var deploymentTarget = preferences["deployment-target"];
        if (deploymentTarget) {
            promise = promise.then(function (): Q.Promise<any> {
                return IOSBuildHelper.appendToBuildConfig("IPHONEOS_DEPLOYMENT_TARGET = " + deploymentTarget);
            });
        }

        // Ensure we end the line so the config file is in a good state if we try to append things later.
        promise = promise.then(function (): Q.Promise<any> {
            return IOSBuildHelper.appendToBuildConfig("");
        });

        return promise;
    }

    private static change_directory(currentBuild: BuildInfo): any {
        process.chdir(currentBuild.appDir);
        // Cordova checks process.env.PWD before process.cwd()
        // so we need to update that as well.
        process.env.PWD = currentBuild.appDir;
        return {};
    }

    private static addOrPrepareIOS(): Q.Promise<any> {
        if (!fs.existsSync("platforms")) {
            fs.mkdirSync("platforms");
        }

        if (!fs.existsSync(path.join("platforms", "ios"))) {
            console.info("cordova platform add ios");
            // Note that "cordova platform add" eventually calls "cordova prepare" internally, which is why we don't invoke prepare ourselves when we add the platform.
            return cordova.raw.platform("add", "ios");
        } else {
            return IOSBuildHelper.update_ios();
        }
    }

    private static update_ios(): Q.Promise<any> {
        var promise: Q.Promise<any> = Q({});
        if (currentBuild.changeList.deletedPluginsIos) {
            // TODO (Devdiv 1160581): Incremental builds complicate things here.
            // If we change to sending over the platforms/ios folder, then this issue is solved.
            // We either need to add / remove plugins, as we do here (Note: this might cause issues for plugins installed locally / doing plugin dev?)
            // Or add/remove the platform, which means that builds won't actually be incremental (uploads will be, but not the build)
            currentBuild.changeList.deletedPluginsIos.forEach(function (deletedPlugin: string): void {
                promise = promise.then(function (): Q.Promise<any> {
                    return cordova.raw.plugin("remove", deletedPlugin).fail(IOSBuildHelper.pluginRemovalErrorHandler);
                });
            });

            currentBuild.changeList.addedPluginsIos.forEach(function (addedPlugin: string): void {
                promise = promise.then(function (): Q.Promise<any> {
                    return cordova.raw.plugin("add", addedPlugin);
                });
            });
        }

        return promise.then(function (): Q.Promise<any> {
            // This step is what will push updated files from www/ to platforms/ios/www
            // It will also clobber any changes to some platform specific files such as platforms/ios/config.xml
            return cordova.raw.prepare({ platforms: ["ios"] });
        });
    }

    private static pluginRemovalErrorHandler(err: any): void {
        console.info(err);
    }

    private static appendToBuildConfig(data: string): Q.Promise<any> {
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

    private static prepareNativeOverrides(): Q.Promise<any> {
        var resFrom = path.join("res", "native", "ios");
        if (!fs.existsSync(resFrom)) {
            // If res -> native folder isn't here then it could be a project that was created when
            // the res -> cert folder still existed, so check for that location as well.
            resFrom = path.join("res", "cert", "ios");
        }

        if (fs.existsSync(resFrom)) {
            var resTo = path.join("platforms", "ios");
            return UtilHelper.copyRecursive(resFrom, resTo);
        }

        return Q({});
    }

    private static updateAppPlistBuildNumber(): void {
        var appPlistFile = path.join("platforms", "ios", currentBuild["appName"], currentBuild["appName"] + "-Info.plist");
        plist.updateAppBundleVersion(appPlistFile, currentBuild.buildNumber);
    }

    private static build_ios(): Q.Promise<any> {
        console.info("cordova compile ios");
        var configuration = (currentBuild.configuration === "debug") ? "--debug" : "--release";
        var opts = (currentBuild.options.length > 0) ? [currentBuild.options, configuration] : [configuration];
        return cordova.raw.compile({ platforms: ["ios"], options: opts });
    }

    private static rename_app(): Q.Promise<any> {
        // We want to make sure that the .app file is named according to the package Id
        // in order to avoid issues with unicode names and to allow us to identify which
        // application to attach to for debugging.
        var deferred = Q.defer();
        var isDeviceBuild = currentBuild.options === "--device";
        var oldName = path.join("platforms", "ios", "build", isDeviceBuild ? "device" : "emulator", currentBuild["appName"] + ".app");
        var newName = path.join("platforms", "ios", "build", isDeviceBuild ? "device" : "emulator", cfg.id() + ".app");

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

    private static package_ios(): Q.Promise<any> {
        var deferred = Q.defer();

        // need quotes around ipa paths for xcrun exec to work if spaces in path
        var appDirName = cfg.id() + ".app";
        var ipaFileName = currentBuild["appName"] + ".ipa";
        var pathToCordovaApp = UtilHelper.quotesAroundIfNecessary(path.join("platforms", "ios", "build", "device", appDirName));
        var fullPathToIpaFile = UtilHelper.quotesAroundIfNecessary(path.join(process.cwd(), "platforms", "ios", "build", "device", ipaFileName));

        child_process.exec("xcrun -v -sdk iphoneos PackageApplication " + pathToCordovaApp + " -o " + fullPathToIpaFile, {},
            function (error: Error, stdout: Buffer, stderr: Buffer): void {
                console.info("xcrun.stdout: " + stdout);
                console.info("xcrun.stderr: " + stderr);
                if (error) {
                    deferred.reject(error);
                } else {
                    var plistFileName = currentBuild["appName"] + ".plist";
                    var fullPathToPlistFile = path.join(process.cwd(), "platforms", "ios", "build", "device", plistFileName);
                    plist.createEnterprisePlist(cfg, fullPathToPlistFile);
                    deferred.resolve({});
                }
            });

        return deferred.promise;
    }
}
