/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/tacoUtils.d.ts" />
/// <reference path="../../typings/rimraf.d.ts" />
"use strict";

import rimraf = require ("rimraf");

import resources = require ("../resources/resourceManager");
import TacoRemoteConfig = require ("./tacoRemoteConfig");
import utils = require ("taco-utils");

import Logger = utils.Logger;

class BuildRetention {
    private static statesToNotDelete = [utils.BuildInfo.BUILDING, utils.BuildInfo.EXTRACTED, utils.BuildInfo.UPLOADING, utils.BuildInfo.UPLOADED];
    private maxBuildsToKeep: number;

    constructor(baseBuildDir: string, config: TacoRemoteConfig) {
        this.maxBuildsToKeep = config.maxBuildsToKeep;
    }

    private static deleteBuilds(builds: { [idx: string]: utils.BuildInfo }, toDelete: string[], sync?: boolean): void {
        for (var i: number = 0; i < toDelete.length; ++i) {
            var idx: string = toDelete[i];
            var buildInfo: utils.BuildInfo = builds[idx];
            Logger.log(resources.getString("BuildRetentionDelete", buildInfo.buildNumber, buildInfo.buildDir));
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

    public purge(builds: { [idx: string]: utils.BuildInfo }): void {
        var buildNumbers: string[] = Object.keys(builds);
        var nBuildsToDelete: number = buildNumbers.length - this.maxBuildsToKeep;
        if (nBuildsToDelete <= 0) {
            return;
        }

        // eligible builds do not include those queued up or currently building.
        var eligibleBuilds: utils.BuildInfo[] = [];
        for (var i: number = 0; i < buildNumbers.length; i++) {
            var buildInfo: utils.BuildInfo = builds[buildNumbers[i]];
            if (BuildRetention.statesToNotDelete.indexOf(buildInfo.status) === -1) {
                eligibleBuilds.push(buildInfo);
            }
        };
        // sort eligible builds by oldest first, then delete required number
        eligibleBuilds.sort(function (b1: utils.BuildInfo, b2: utils.BuildInfo): number {
            var diff: number = <any> b1.submissionTime - <any> b2.submissionTime;
            return (diff === 0) ? 0 : (diff > 0 ? +1 : -1);
        });
        if (nBuildsToDelete > eligibleBuilds.length) {
            nBuildsToDelete = eligibleBuilds.length;
        }

        var numbersToDelete: string[] = eligibleBuilds.slice(0, nBuildsToDelete).map(function (b: utils.BuildInfo): string {
            return b.buildNumber.toString();
        });
        Logger.log(resources.getString("BuildRetentionPreDelete", nBuildsToDelete));
        BuildRetention.deleteBuilds(builds, numbersToDelete, false);
    }

    public deleteAllSync(builds: { [idx: string]: utils.BuildInfo }): void {
        var buildNumbers: string[] = Object.keys(builds);
        BuildRetention.deleteBuilds(builds, buildNumbers, true);
    }
}

export = BuildRetention;
