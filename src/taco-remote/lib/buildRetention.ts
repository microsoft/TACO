/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/tacoUtils.d.ts" />
/// <reference path="../../typings/rimraf.d.ts" />
"use strict";

import rimraf = require ("rimraf");

import resources = require("../resources/resourceManager");
import TacoRemoteConfig = require ("./tacoRemoteConfig");
import utils = require ("taco-utils");

class BuildRetention {
    private maxBuildsToKeep: number;

    constructor(baseBuildDir: string, config: TacoRemoteConfig) {
        this.maxBuildsToKeep = config.maxBuildsToKeep;
        console.info(resources.getString("BuildRetentionInit"), baseBuildDir, this.maxBuildsToKeep);
    }

    public purge(builds: { [idx: string]: utils.BuildInfo }): void {
        var buildNumbers = Object.keys(builds);
        var nBuildsToDelete = buildNumbers.length - this.maxBuildsToKeep;
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
        console.info(resources.getString("BuildRetentionPreDelete"), nBuildsToDelete);
        BuildRetention.deleteBuilds(builds, numbersToDelete, false);
    }

    public deleteAllSync(builds: { [idx: string]: utils.BuildInfo }): void {
        var buildNumbers = Object.keys(builds);
        BuildRetention.deleteBuilds(builds, buildNumbers, true);
    }

    private static deleteBuilds(builds: { [idx: string]: utils.BuildInfo }, toDelete: string[], sync?: boolean): void {
        for (var i = 0; i < toDelete.length; ++i) {
            var idx = toDelete[i];
            var buildInfo = builds[idx];
            console.info(resources.getString("BuildRetentionDelete"), buildInfo.buildNumber, buildInfo.buildDir);
            if (sync) {
                rimraf.sync(buildInfo.buildDir);
            } else {
                BuildRetention.deleteBuildDirectoryAsync(buildInfo.buildDir);
            }

            delete builds[idx];
        }
    }

    private static deleteBuildDirectoryAsync(buildDir: string, callback?: Function): void {
        rimraf(buildDir, function (err: Error): void {
            if (callback) {
                callback(err);
            }
        });
    }
}

export = BuildRetention;