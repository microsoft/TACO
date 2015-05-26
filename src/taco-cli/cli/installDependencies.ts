/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />
/// <reference path="../../typings/tacoDependencyInstaller.d.ts" />
/// <reference path="../../typings/tacoUtils.d.ts" />

"use strict";

import nopt = require ("nopt");
import Q = require ("q");

import resources = require ("../resources/resourceManager");
import dependencies = require ("taco-dependency-installer");
import TacoErrorCodes = require ("./tacoErrorCodes");
import errorHelper = require ("./tacoErrorHelper");
import tacoUtils = require ("taco-utils");

import commands = tacoUtils.Commands;
import utils = tacoUtils.UtilHelper;
import logger = tacoUtils.Logger;

/*
 * InstallDependencies
 *
 * Handles "taco install-dependencies"
 */
class InstallDependencies implements commands.IDocumentedCommand {
    private static KnownOptions: Nopt.FlagTypeMap = { };

    public info: commands.ICommandInfo;

    public run(data: commands.ICommandData): Q.Promise<any> {
        var parsed: commands.ICommandData = null;

        try {
            parsed = this.parseArguments(data);
            this.verifyArguments(parsed);
        } catch (err) {
            return Q.reject(err);
        }

        var installer: dependencies.DependencyInstaller = new dependencies.DependencyInstaller();

        return installer.run(parsed);
    }

    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
        return true;
    }

    private parseArguments(args: commands.ICommandData): commands.ICommandData {
        return tacoUtils.ArgsHelper.parseArguments(InstallDependencies.KnownOptions, {}, args.original, 0);
    }

    private verifyArguments(data: commands.ICommandData): void {
        // Exactly 1 platform name must be specified
        if (data.remain.length !== 1) {
            throw errorHelper.get(TacoErrorCodes.CommandInstallDependenciesOnlyOnePlatform);
        }
    }
}

export = InstallDependencies;