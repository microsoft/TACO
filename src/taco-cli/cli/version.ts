/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

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

    public canHandleArgs(data: commands.ICommandData): boolean {
        return true;
    }

    public parseArgs(args: string[]): commands.ICommandData {
        return { options: {}, original: [], remain: [] };
    }

    /**
     * entry point for printing version
     */
    protected runCommand(data: commands.ICommandData): Q.Promise<any> {
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
