/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import child_process = require('child_process');
import path = require('path');
import Q = require('q');

import util = require('../util');
// Note: Other than this first function, this file is not intended to be loaded as a module, but rather in a separate process.

module Emulate {
    export function init(): void {
        process.env['PATH'] = path.resolve(__dirname, path.join('..', '..', 'node_modules', 'ios-sim', 'build', 'release')) + ':' + process.env['PATH'];
        child_process.exec('which ios-sim', function (err, stdout, stderr) {
            if (err !== null) {
                console.error(require('../resources').getString(require('nconf').get('lang'), "IOSSimNotFound"));
            } else {
                //console.info('ios-sim is installed on path at: %s', stdout);
            }
        });
    }
}

export = Emulate;

process.on('message', function (emulateRequest) {
    Q.fcall(emulate, emulateRequest)
        .then(function (result) {
            process.send(result);
        }).done();
});

function emulate(emulateRequest: { appDir: string; appName: string; target: string}): Q.Promise<{ status: string; messageId: string; messageArgs?: any }>{
    return Q.fcall(cdToAppDir, emulateRequest)
        .then(cordovaEmulate)
        .then(function success() {
            return { status: 'emulated', messageId: 'EmulateSuccess' };
        }, function fail(e) {
            return { status: 'error', messageId: 'EmulateFailedWithError', messageArgs: e.message };
        });
}

function cdToAppDir(emulateRequest: { appDir: string; appName: string; target: string }): { appDir: string; appName: string; target: string} {
    process.chdir(emulateRequest.appDir);
    return emulateRequest;
} 

function cordovaEmulate(emulateRequest: { appDir: string; appName: string; target: string }): Q.Promise<{}>{
    var deferred = Q.defer();
    var emulatorAppPath = util.quotesAroundIfNecessary(path.join(emulateRequest.appDir, 'platforms', 'ios', 'build', 'emulator', emulateRequest.appName + '.app'));
    child_process.exec('killall \'iPhone Simulator\'', function (error, stdout, stderr) {
        child_process.exec('ios-sim launch ' + emulatorAppPath + ' ' + iosSimTarget(emulateRequest.target) + ' --exit', function (error, stdout, stderr) {
            if (error !== null) {
                deferred.reject(error);
            } else {
                deferred.resolve({});
            }
        });
    });
    return deferred.promise;
}

var iosSimTargets: { [id: string]: string } = {
    'iphone 4s': '--retina',
    'iphone 5': '--retina --tall',
    'iphone 5s': '--retina --tall --64bit',
    'iphone 6': '--devicetypeid com.apple.CoreSimulator.SimDeviceType.iPhone-6',
    'iphone 6 plus': '--devicetypeid com.apple.CoreSimulator.SimDeviceType.iPhone-6-Plus',
    'ipad 2': '--family ipad',
    'ipad air': '--family ipad --retina --64bit',
    'ipad retina': '--family ipad --retina'
};

function iosSimTarget(emulateRequestTarget: string) : string {
    emulateRequestTarget = emulateRequestTarget.toLowerCase();
    var iosSimTarget = iosSimTargets[emulateRequestTarget] || '--family iphone --retina';
    return iosSimTarget;
}