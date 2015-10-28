/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />

"use strict";

import Q = require ("q");
import simulate = require ("taco-simulate");

import tacoUtils = require ("taco-utils");

import commands = tacoUtils.Commands;
import logger = tacoUtils.Logger;

class Simulate extends commands.TacoCommandBase {
    private static KNOWN_OPTIONS: Nopt.FlagTypeMap = {
        target: String
    };

    private static parseArguments(args: commands.ICommandData): commands.ICommandData {
        return tacoUtils.ArgsHelper.parseArguments(Simulate.KNOWN_OPTIONS, {}, args.original, 0);
    }

    public run(data: commands.ICommandData): Q.Promise<any> {
        var parsed: commands.ICommandData = null;
        try {
            parsed = Simulate.parseArguments(data);
        } catch (err) {
            return Q.reject(err);
        }
        return simulate({platform: parsed.remain[0], target: parsed.options['target']});
    }

    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
        return true;
    }
}

export = Simulate;
