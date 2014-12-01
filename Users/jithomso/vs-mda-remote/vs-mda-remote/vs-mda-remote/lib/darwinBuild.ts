/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import bi = require('./buildInfo');
import resources = require('./resources');
import CordovaConfig = require('./cordovaConfig');
import util = require('./util');
import cordova = require('cordova');
import path = require('path');
import Q = require('q');
import fs = require('fs');
import plist = require('./plist');
import rimraf = require('rimraf');
import child_process = require('child_process');

cordova.on('results', console.info);
cordova.on('log', console.info);
cordova.on('warn', console.warn);
cordova.on('error', console.error);
cordova.on('verbose', console.info);

cordova.on('before_prepare', beforePrepare);
cordova.on('after_compile', afterCompile);

// This file is not imported via modules, but rather invoked in a new process.
// All stderr/stdout messages are captured by the parent process and logged to a file.

// TODO: Make this file localizable
resources.init();

var currentBuild: bi.BuildInfo = null;
var cfg: CordovaConfig = null;
var language: string = null;

process.on('message', function (buildRequest: { buildInfo: bi.BuildInfo; language: string }) {
    if (currentBuild !== null) {
        var buildInfo = buildRequest.buildInfo;
        buildInfo.updateStatus(bi.ERROR,'BuildInvokedTwice');
        process.send(buildInfo);
        process.exit(1);
    }

    language = buildRequest.language;

    build(buildRequest.buildInfo, function (resultBuildInfo: bi.BuildInfo) {
        process.send(resultBuildInfo);
    });
});

// TODO: Is this the correct time? Should we instead trigger this after the prepare?
function beforePrepare(data) {
    // Instead of a build, we call prepare and then compile
    // trigger the before_build in case users expect it
    cordova.emit('before_build', data);
}

function afterCompile(data) {
    // Instead of a build, we call prepare and then compile
    // trigger the after_build in case users expect it
    cordova.emit('after_build', data);
}

function build(buildInfoData: bi.BuildInfo, callback: Function) {
    currentBuild = bi.createNewBuildInfoFromDataObject(buildInfoData);
    cfg = new CordovaConfig(path.join(currentBuild.appDir, 'config.xml'));

    var noOp: () => void = function () { }
    var isDeviceBuild = currentBuild.options.indexOf('--device') !== -1;

    try {
    Q.fcall(change_directory)
        .then(add_ios)
        .then(isDeviceBuild ? setupSigning : noOp)
        .fcall(applyPreferencesToBuildConfig, cfg)
        .then(prepareIconsAndSplashscreens)
        .then(prepareResFiles)
        .then(updateAppPlistBuildNumber)
        .then(build_ios)
        .then(rename_app)
        .then(isDeviceBuild ? package_ios : noOp)
        .then(function () {
            console.info(new Date() + ' Done building ' + currentBuild.buildNumber);
            currentBuild.updateStatus(bi.COMPLETE);
        })
        .catch(function (err) {
            console.info(new Date() + ' Failed to build app for buildNumber: ' + currentBuild.buildNumber + ': ' + err.message);
            currentBuild.updateStatus(bi.ERROR, 'BuildFailedWithError', err.message);
        })
        .done(function () {
            callback(currentBuild);
        });
    } catch (e) {
        currentBuild.updateStatus(bi.ERROR, 'BuildFailedWithError', e.message);
        console.info(new Date() + ' Error from buildNumber [' + currentBuild.buildNumber + '] in directory ' + currentBuild.buildDir + ': ' + e.message);
        callback(currentBuild);
    }
    
}

function change_directory() {
    process.chdir(currentBuild.appDir);
}

function add_ios() : Q.Promise<any>{
    if (!fs.existsSync('platforms')) {
        fs.mkdirSync('platforms');
    }
    if (!fs.existsSync(path.join('platforms', 'ios'))) {
        console.info('adding ios platform...');
        return cordova.raw.platform('add', 'ios');
    } else {
        return update_ios();
    }
}

function update_ios() : Q.Promise<any>{
    var promise : Q.Promise<any> = Q({});
    if (currentBuild.changeList) {
        // TODO: Incremental builds complicate things here.
        // We either need to add / remove plugins, as we do here (Note: this might cause issues for plugins installed locally / doing plugin dev?)
        // Or add/remove the platform, which means that builds won't actually be incremental (uploads will be, but not the build)
        currentBuild.changeList.deletedPluginsIos.forEach(function (deletedPlugin) {
            promise = promise.then(function () {
                return cordova.raw.plugin('remove', deletedPlugin).fail(pluginRemovalErrorHandler);
            });
        });

        currentBuild.changeList.addedPluginsIos.forEach(function (addedPlugin) {
            promise = promise.then(function () {
                return cordova.raw.plugin('add', addedPlugin);
            });
        });
    }

    return promise.then(function () {
        return cordova.raw.prepare({ platforms: ['ios'] });
    });
}

function pluginRemovalErrorHandler(err) {
    console.info(err);
}

function setupSigning() : Q.Promise<void> {
    var promise: Q.Promise<void> = Q.fcall(function () { });

    if (currentBuild.configuration !== 'distribution') {
        console.info('configuration is ' + currentBuild.configuration + ', no signing changes necessary');
    } else {
        console.info('setting up for distribution signing...');

        // By appending CODE_SIGN_IDENTITY, we effectively overwrite any previous CODE_SIGN_IDENTITY value.
        // This allows us to have our functionality while not depending on modifications cordova may make to build.xcconfig in the future.
        promise = appendToBuildConfig('CODE_SIGN_IDENTITY = iPhone Distribution');
    }

    return promise;
}

function appendToBuildConfig(data: string) : Q.Promise<any>{
    var deferred = Q.defer();

    var buildConfigDir = path.join('platforms', 'ios', 'cordova');
    if (!fs.existsSync(buildConfigDir)) {
        deferred.reject(new Error("Directory for build.xcconfig does not exist."));
    } else {
        fs.appendFile(path.join(buildConfigDir, 'build.xcconfig'), '\n' + data, function (err) {
            if (err) {
                deferred.reject(new Error(err));
            } else {
                deferred.resolve({});
            }
        });
    }

    return deferred.promise;
}

function applyPreferencesToBuildConfig (config: CordovaConfig) : Q.Promise<any> {
    var promise = Q({});

    var preferences = config.preferences();

    // Always put the targeted device into the build config.
    // If a valid overriding device is not given, use 'universal'
    var deviceToAdd = '1,2';
    var validOverridingTargetDevices = {};
    validOverridingTargetDevices['handset'] = '1';
    validOverridingTargetDevices['tablet'] = '2';

    var targetDevice = preferences['target-device'];
    if (targetDevice && validOverridingTargetDevices[targetDevice]) {
        deviceToAdd = validOverridingTargetDevices[targetDevice];
    }
    promise = promise.then(function () {
        return appendToBuildConfig('TARGETED_DEVICE_FAMILY = ' + deviceToAdd);
    });

    var deploymentTarget = preferences['deployment-target'];
    if (deploymentTarget) {
        promise = promise.then(function () {
            return appendToBuildConfig('IPHONEOS_DEPLOYMENT_TARGET = ' + deploymentTarget);
        });
    }

    // Ensure we end the line so the config file is in a good state if we try to append things later.
    promise = promise.then(function () {
        return appendToBuildConfig('');
    });

    return promise;
}

// TODO: Deprecate using this in favor of the Cordova config.xml functionality for specifying icons
function prepareIconsAndSplashscreens() {
    console.info('------ Copying Icons and Splashscreens for ios');
    var icons = path.join('res', 'icons', 'ios');
    var splash = path.join('res', 'screens', 'ios');
    var iconsTo = path.join('platforms', 'ios', currentBuild.appName, 'Resources', 'icons');
    updateOrRemoveTargetFile(path.join(icons, 'icon-57.png'), path.join(iconsTo, 'icon.png'));
    updateOrRemoveTargetFile(path.join(icons, 'icon-57-2x.png'), path.join(iconsTo, 'icon@2x.png'));
    updateOrRemoveTargetFile(path.join(icons, 'icon-40.png'), path.join(iconsTo, 'icon-40.png'));
    updateOrRemoveTargetFile(path.join(icons, 'icon-40-2x.png'), path.join(iconsTo, 'icon-40@2x.png'));
    updateOrRemoveTargetFile(path.join(icons, 'icon-50.png'), path.join(iconsTo, 'icon-50.png'));
    updateOrRemoveTargetFile(path.join(icons, 'icon-50-2x.png'), path.join(iconsTo, 'icon-50@2x.png'));
    updateOrRemoveTargetFile(path.join(icons, 'icon-60.png'), path.join(iconsTo, 'icon-60.png'));
    updateOrRemoveTargetFile(path.join(icons, 'icon-60-2x.png'), path.join(iconsTo, 'icon-60@2x.png'));
    updateOrRemoveTargetFile(path.join(icons, 'icon-72.png'), path.join(iconsTo, 'icon-72.png'));
    updateOrRemoveTargetFile(path.join(icons, 'icon-72-2x.png'), path.join(iconsTo, 'icon-72@2x.png'));
    updateOrRemoveTargetFile(path.join(icons, 'icon-76.png'), path.join(iconsTo, 'icon-76.png'));
    updateOrRemoveTargetFile(path.join(icons, 'icon-76-2x.png'), path.join(iconsTo, 'icon-76@2x.png'));
    updateOrRemoveTargetFile(path.join(icons, 'icon-small.png'), path.join(iconsTo, 'icon-small.png'));
    updateOrRemoveTargetFile(path.join(icons, 'icon-small-2x.png'), path.join(iconsTo, 'icon-small@2x.png'));

    var screensTo = path.join('platforms', 'ios', currentBuild.appName, 'Resources', 'splash');
    updateOrRemoveTargetFile(path.join(splash, 'screen-ipad-landscape.png'), path.join(screensTo, 'Default-Landscape~ipad.png'));
    updateOrRemoveTargetFile(path.join(splash, 'screen-ipad-landscape-2x.png'), path.join(screensTo, 'Default-Landscape@2x~ipad.png'));
    updateOrRemoveTargetFile(path.join(splash, 'screen-ipad-portrait.png'), path.join(screensTo, 'Default-Portrait~ipad.png'));
    updateOrRemoveTargetFile(path.join(splash, 'screen-ipad-portrait-2x.png'), path.join(screensTo, 'Default-Portrait@2x~ipad.png'));
    updateOrRemoveTargetFile(path.join(splash, 'screen-iphone-portrait.png'), path.join(screensTo, 'Default~iphone.png'));
    updateOrRemoveTargetFile(path.join(splash, 'screen-iphone-portrait-2x.png'), path.join(screensTo, 'Default@2x~iphone.png'));
    updateOrRemoveTargetFile(path.join(splash, 'screen-iphone-568h-2x.png'), path.join(screensTo, 'Default-568h@2x~iphone.png'));
}

function updateOrRemoveTargetFile(source: string, target: string): Q.Promise<{}>{
    if (fs.existsSync(source)) {
        return util.copyFile(source, target)
    }
    else if (fs.existsSync(target)) {
        console.info('------ Source asset does not exist:  ' + source);
        console.info('------ Removing mapped target asset:  ' + target);
        return Q.denodeify(fs.unlink)(target);
    }
}

function prepareResFiles() {
    console.info('------ Copying other res files for ios');
    var resFrom = path.join('res', 'native', 'ios');
    if (!fs.existsSync(resFrom)) {
        // If res -> native folder isn't here then it could be a project that was created when
        // the res -> cert folder still existed, so check for that location as well.
        resFrom = path.join('res', 'cert', 'ios');
    }

    if (fs.existsSync(resFrom)) {
        var resTo = path.join('platforms', 'ios', currentBuild.appName);
        return util.copyRecursive(resFrom, resTo);
    }
}

function updateAppPlistBuildNumber() {
    var appPlistFile = path.join('platforms', 'ios', currentBuild.appName, currentBuild.appName + '-Info.plist');
    plist.updateAppBundleVersion(appPlistFile, currentBuild.buildNumber);
}

function build_ios() {
    console.info('building ios platform...');
    var configuration = (currentBuild.configuration === 'debug') ? '--debug' : '--release';
    var opts = (currentBuild.options.length > 0) ? [currentBuild.options, configuration] : [configuration];
    return cordova.raw.compile({ platforms: ['ios'], options: opts });
}

function rename_app(): Q.Promise<{}>{
    // We want to make sure that the .app file is named according to the package Id
    // in order to avoid issues with unicode names and to allow us to identify which
    // application to attach to for debugging.
    var deferred = Q.defer();
    var isDeviceBuild = currentBuild.options === '--device';
    var oldName = path.join('platforms', 'ios', 'build', isDeviceBuild ? 'device' : 'emulator', currentBuild.appName + '.app');
    var newName = path.join('platforms', 'ios', 'build', isDeviceBuild ? 'device' : 'emulator', cfg.id() + '.app');

    if (oldName != newName && fs.existsSync(oldName)) {
        var clearOldData = Q.defer();
        if (fs.existsSync(newName)) {
            var safeNewName = util.quotesAroundIfNecessary(newName);

            rimraf(newName, function (error) {
                if (error) {
                    clearOldData.reject(error);
                } else {
                    clearOldData.resolve({})
                }
            });
        } else {
            clearOldData.resolve({});
        }
        clearOldData.promise.then(function () {
            fs.rename(oldName, newName, function (err) {
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

function package_ios() {
    console.info('packaging ios platform...');
    var deferred = Q.defer();

    // need quotes around ipa paths for xcrun exec to work if spaces in path
    var appDirName = cfg.id() + '.app';
    var ipaFileName = currentBuild.appName + '.ipa';
    var pathToCordovaApp = util.quotesAroundIfNecessary(path.join('platforms', 'ios', 'build', 'device', appDirName));
    var fullPathToIpaFile = util.quotesAroundIfNecessary(path.join(process.cwd(), 'platforms', 'ios', 'build', 'device', ipaFileName));

    child_process.exec('xcrun -v -sdk iphoneos PackageApplication ' + pathToCordovaApp + ' -o ' + fullPathToIpaFile,
        function (error, stdout, stderr) {
            console.info('xcrun.stdout: ' + stdout);
            console.info('xcrun.stderr: ' + stderr);
            if (error !== null) {
                console.info('Error from packaging app to ipa using xcrun: ' + error);
                deferred.reject(error);
            } else {
                console.info('Done packaging app to ipa using xcrun.');
                var plistFileName = currentBuild.appName + '.plist';
                var fullPathToPlistFile = path.join(process.cwd(), 'platforms', 'ios', 'build', 'device', plistFileName);
                console.info('Creating plist file %s ...', fullPathToPlistFile);
                plist.createEnterprisePlist(cfg, fullPathToPlistFile);
                deferred.resolve({});
            }
        });

    return deferred.promise;
}