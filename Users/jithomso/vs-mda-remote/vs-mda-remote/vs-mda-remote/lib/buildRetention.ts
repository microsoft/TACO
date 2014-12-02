/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import rimraf = require('rimraf');
import bi = require('./buildInfo');
import resources = require('./resources');

module BuildRetention {
    var maxBuildsToKeep: number;
    var conf: { get(prop: string): any };
    export function init(baseBuildDir: string, config: { get(prop: string): any }): void {
        conf = config;
        maxBuildsToKeep = conf.get('maxBuildsToKeep');
        console.info(resources.getString(conf.get('lang'), 'BuildRetentionInit'), baseBuildDir, maxBuildsToKeep);
    }

    export function purge(builds: { [idx: string]: bi.BuildInfo }) : void {
        var buildNumbers = Object.keys(builds);
        var nBuildsToDelete = buildNumbers.length - maxBuildsToKeep;
        if (nBuildsToDelete <= 0) {
            return;
        }

        // eligible builds do not include those queued up or currently building.
        var eligibleBuilds: bi.BuildInfo[] = [];
        for (var i = 0; i < buildNumbers.length; i++) {
            var buildInfo = builds[buildNumbers[i]];
            if (buildInfo.status === bi.COMPLETE || buildInfo.status === bi.DOWNLOADED ||
                buildInfo.status === bi.DELETED || buildInfo.status === bi.ERROR ||
                buildInfo.status === bi.EMULATED || buildInfo.status === bi.INVALID) {
                eligibleBuilds.push(buildInfo);
            }
        };
        // sort eligible builds by oldest first, then delete required number
        eligibleBuilds.sort(function (b1, b2) {
            var diff = <any>b1.submissionTime - <any>b2.submissionTime;
            return (diff === 0) ? 0 : (diff > 0 ? +1 : -1);
        });
        if (nBuildsToDelete > eligibleBuilds.length) {
            nBuildsToDelete = eligibleBuilds.length;
        }
        var numbersToDelete = eligibleBuilds.slice(0, nBuildsToDelete).map(function (b: bi.BuildInfo): string {
            return b.buildNumber.toString();
        });
        console.info(resources.getString(conf.get('lang'), "BuildRetentionPreDelete"), nBuildsToDelete);
        deleteBuilds(builds, numbersToDelete, false);
    }

    export function deleteAllSync(builds) : void {
        var buildNumbers = Object.keys(builds);
        deleteBuilds(builds, buildNumbers, true);
    }

    function deleteBuilds(builds: { [idx: string]: bi.BuildInfo }, toDelete: string[], sync?:boolean): void {
        for (var i = 0; i < toDelete.length; ++i) {
            var idx = toDelete[i];
            var buildInfo = builds[idx];
            console.info(resources.getString(conf.get('lang'), "BuildRetentionDelete"), buildInfo.buildNumber, buildInfo.buildDir);
            if (sync) {
                rimraf.sync(buildInfo.buildDir);
            } else {
                deleteBuildDirectory(buildInfo.buildDir);
            }
            delete builds[idx];
        }
    }

    function deleteBuildDirectory(buildDir: string, callback?: Function) {
        rimraf(buildDir, function (err) {
            if (callback) {
                callback(err);
            }
        });
    };

}

export = BuildRetention