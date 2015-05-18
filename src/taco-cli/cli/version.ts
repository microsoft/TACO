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
import level = logger.Level;

/*
 * Version
 *
 * handles "Taco Version"
 */
class Version implements commands.IDocumentedCommand {
    public info: commands.ICommandInfo;

    public canHandleArgs(data: commands.ICommandData): boolean {
        return true;
    }

    /**
     * entry point for printing version
     */
    public run(data: commands.ICommandData): Q.Promise<any> {
        this.printTacoVersion();

        return Q({});
    }

    /**
     * prints out Taco Version
     */
    private printTacoVersion(): void {
        logger.logLine(require("../package.json").version, level.Normal);
    }
}

export = Version;