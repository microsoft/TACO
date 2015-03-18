/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/taco-utils.d.ts" />
/// <reference path="../../typings/rimraf.d.ts" />
"use strict";

import rimraf = require ("rimraf");
import utils = require ("taco-utils");

import resources = utils.ResourcesManager;

module BuildRetention {
    var maxBuildsToKeep: number;
    var conf: { get(prop: string): any };
    export function init(baseBuildDir: string, config: { get(prop: string): any }): void {
        conf = config;
        maxBuildsToKeep = conf.get("maxBuildsToKeep");
        console.info(resources.getStringForLanguage(conf.get("lang"), "BuildRetentionInit"), baseBuildDir, maxBuildsToKeep);
    }

    export function purge(builds: { [idx: string]: utils.BuildInfo }): void {
        var buildNumbers = Object.keys(builds);
        var nBuildsToDelete = buildNumbers.length - maxBuildsToKeep;
        if (nBuildsToDelete <= 0) {
            return;
        }

        // eligible builds do not include those queued up or currently building.
        var eligibleBuilds: utils.BuildInfo[] = [];
        for (var i = 0; i < buildNumbers.length; i++) {
            var buildInfo = builds[buildNumbers[i]];
            if (buildInfo.status === utils.BuildInfo.COMPLETE || buildInfo.status === utils.BuildInfo.DOWNLOADED ||
                buildInfo.status === utils.BuildInfo.ERROR || buildInfo.status === utils.BuildInfo.EMULATED ||
                buildInfo.status === utils.BuildInfo.INVALID) {
                eligibleBuilds.push(buildInfo);
            }
        };
        // sort eligible builds by oldest first, then delete required number
        eligibleBuilds.sort(function (b1: utils.BuildInfo, b2: utils.BuildInfo): number {
            var diff = <any>b1.submissionTime - <any>b2.submissionTime;
            return (diff === 0) ? 0 : (diff > 0 ? +1 : -1);
        });
        if (nBuildsToDelete > eligibleBuilds.length) {
            nBuildsToDelete = eligibleBuilds.length;
        }

        var numbersToDelete = eligibleBuilds.slice(0, nBuildsToDelete).map(function (b: utils.BuildInfo): string {
            return b.buildNumber.toString();
        });
        console.info(resources.getStringForLanguage(conf.get("lang"), "BuildRetentionPreDelete"), nBuildsToDelete);
        deleteBuilds(builds, numbersToDelete, false);
    }

    export function deleteAllSync(builds: { [idx: string]: utils.BuildInfo }): void {
        var buildNumbers = Object.keys(builds);
        deleteBuilds(builds, buildNumbers, true);
    }

    function deleteBuilds(builds: { [idx: string]: utils.BuildInfo }, toDelete: string[], sync?: boolean): void {
        for (var i = 0; i < toDelete.length; ++i) {
            var idx = toDelete[i];
            var buildInfo = builds[idx];
            console.info(resources.getStringForLanguage(conf.get("lang"), "BuildRetentionDelete"), buildInfo.buildNumber, buildInfo.buildDir);
            if (sync) {
                rimraf.sync(buildInfo.buildDir);
            } else {
                deleteBuildDirectoryAsync(buildInfo.buildDir);
            }

            delete builds[idx];
        }
    }

    function deleteBuildDirectoryAsync(buildDir: string, callback?: Function): void {
        rimraf(buildDir, function (err: Error): void {
            if (callback) {
                callback(err);
            }
        });
    };
}

export = BuildRetention;