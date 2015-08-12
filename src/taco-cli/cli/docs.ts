/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/tacoUtils.d.ts" />
/// <reference path="../../typings/opener.d.ts" />

"use strict";

import Q = require ("q");

import resources = require ("../resources/resourceManager");
import tacoUtility = require ("taco-utils");
import opener = require ("opener");

import commands = tacoUtility.Commands;

/**
 * Documentation
 *
 * Handles "taco Documentation"
 */
class Documentation extends commands.TacoCommandBase {
    public info: commands.ICommandInfo;

    public run(data: commands.ICommandData): Q.Promise<any> {
        // This implementation is based on "npm docs": https://github.com/npm/npm/blob/master/lib/docs.js
        var link = resources.getString("TacoDocumentationLink");
        opener(link);
        return Q.resolve({});
    }

    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
        return true;
    }
}

export = Documentation;