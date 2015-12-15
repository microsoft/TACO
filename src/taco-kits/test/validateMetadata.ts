/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/should.d.ts"/>
/// <reference path="../../typings/Q.d.ts"/>
/// <reference path="../../typings/tacoUtils.d.ts"/>
/// <reference path="../../typings/tacoKits.d.ts"/>

"use strict";

/* tslint:disable:no-var-requires */
// var require needed for should module to work correctly
// Note not import: We don't want to refer to shouldModule, but we need the require to occur since it modifies the prototype of Object.
var shouldModule: any = require("should");
/* tslint:enable:no-var-requires */

import child_process = require("child_process");
import mocha = require ("mocha");
import Q = require("q");
import util = require("util");

import tacoUtility = require ("taco-utils");

import NpmHelper = tacoUtility.NpmHelper;
import tacoKits = require ("../tacoKits");
import KitHelper = tacoKits.kitHelper;
import PromiseUtils = tacoUtility.PromisesUtils;

var platformNpmPackageMap: IDictionary<string> = {
    "android": "cordova-android",
    "ios": "cordova-ios",
    "windows": "cordova-windows",
    "wp8": "cordova-wp8"
}

describe("KitMetadata", function(): void {
    it("validate Kit Metadata is correct", function(): Q.Promise<any> {
        return KitHelper.getKitMetadata(true /* reparse */)
            .then(kitMetadata => {
                return PromiseUtils.chain(Object.keys(kitMetadata.kits), (kitId, valueSoFar) => {
                    return Q.all<any>([validatePlatform(kitId), validatePlugin(kitId)]);
                });
            });
    });
});

function validatePlatform(kitId: string): Q.Promise<any> {
    return KitHelper.getPlatformOverridesForKit(kitId)
        .then(platformOverrides => {
            return Q.all(Object.keys(platformOverrides).map(platformName => {
                return validateComponent(
                    platformNpmPackageMap[platformName],
                    platformOverrides[platformName].version,
                    platformOverrides[platformName].src);
            }));
        });
}

function validatePlugin(kitId: string): Q.Promise<any> {
    return KitHelper.getPluginOverridesForKit(kitId)
        .then(pluginOverrides => {
            return Q.all(Object.keys(pluginOverrides).map(pluginId => {
                return validateComponent(pluginId, pluginOverrides[pluginId].version, pluginOverrides[pluginId].src);
            }));
        });
}

function validateComponent(packageName: string, version: string, src: string): Q.Promise<any> {
    var overrideValue = version || src;

    // validate we don't have empty entries
    overrideValue.should.not.be.equal(undefined);
    overrideValue.should.not.be.equal("");

    // either version or src should be specified
    (!!version && !!src).should.be.equal(false);

    // validate that version is correct
    if (version) {
        return NpmHelper.view(packageName, ["versions"])
            .then(result => {
                var versions = result[Object.keys(result)[0]].versions;
                if (versions.indexOf(version) <= -1){
                    console.log(packageName + "@" + version);
                }
                versions.indexOf(version).should.be.greaterThan(-1, util.format("Invalid package version: %s@%s", packageName, version));
            })
    }

    return validateGitUrl(src);
}

function validateGitUrl(gitUrl: string): Q.Promise<any> {
    // validate this looks like a git url
    tacoUtility.TacoPackageLoader.GIT_URI_REGEX.test(gitUrl).should.be.equal(true, util.format("Invalid git url: %s", gitUrl));
 
    // validate that we can ls the repository and the repo is public
    var deferred: Q.Deferred<any> = Q.defer();

    // stash in a dummy user, password to enforce no-prompt
    var args = ["ls-remote",gitUrl.replace("//", "//foo@bar")];

    var process: NodeJSChildProcess.ChildProcess = child_process.spawn("git", args)
    process.on("close", function(code: number) {
        code.should.be.equal(0, util.format("Inaccessible git url: %s", gitUrl));
        return deferred.resolve({});
    });

    return deferred.promise;
}
