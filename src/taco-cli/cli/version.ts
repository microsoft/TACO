// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/// <reference path="../../typings/tacoUtils.d.ts" />

"use strict";
import Q = require ("q");
import tacoUtility = require ("taco-utils");
import resources = require ("../resources/resourceManager");

import commands = tacoUtility.Commands;
import logger = tacoUtility.Logger;
import telemetryHelper = tacoUtility.TelemetryHelper;

/**
 * Version
 *
 * handles "Taco Version"
 */
class Version extends commands.TacoCommandBase {
    public info: commands.ICommandInfo;

    public parseArgs(args: string[]): commands.ICommandData {
        return { options: {}, original: [], remain: [] };
    }

    /**
     * entry point for printing version
     */
    protected runCommand(): Q.Promise<any> {
        this.printTacoVersion();
        return Q({});
    }

    /**
     * prints out Taco Version
     */
    private printTacoVersion(): void {
        logger.log(require("../package.json").version);
    }
}

export = Version;
