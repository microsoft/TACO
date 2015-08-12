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

import cordovaWrapper = require ("./utils/cordovaWrapper");
import dependencies = require ("taco-dependency-installer");
import TacoErrorCodes = require ("./tacoErrorCodes");
import errorHelper = require ("./tacoErrorHelper");
import tacoUtils = require ("taco-utils");

import commands = tacoUtils.Commands;
import DependencyInstaller = dependencies.DependencyInstaller;

/*
 * InstallDependencies
 *
 * Handles "taco install-dependencies"
 */
class InstallReqs extends commands.TacoCommandBase {
    private static KnownOptions: Nopt.FlagTypeMap = { };

    public info: commands.ICommandInfo;

    public run(data: commands.ICommandData): Q.Promise<any> {
        var parsed: commands.ICommandData = null;

        try {
            parsed = this.parseArguments(data);
        } catch (err) {
            return Q.reject(err);
        }

        return cordovaWrapper.requirements(parsed.remain)
            .then(function (result: any): Q.Promise<any> {
                var installer: DependencyInstaller = new DependencyInstaller();

                return installer.run(result);
            });
    }

    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
        return true;
    }

    private parseArguments(args: commands.ICommandData): commands.ICommandData {
        return tacoUtils.ArgsHelper.parseArguments(InstallReqs.KnownOptions, {}, args.original, 0);
    }
}

export = InstallReqs;