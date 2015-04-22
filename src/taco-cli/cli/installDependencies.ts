/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />
/// <reference path="../../typings/dependenciesInstaller.d.ts" />
/// <reference path="../../typings/taco-utils.d.ts" />
"use strict";

import nopt = require ("nopt");
import Q = require("q");
import dependenciesInstaller = require ("dependenciesInstaller");
import tacoUtils = require ("taco-utils");
import utils = tacoUtils.UtilHelper;
import commands = tacoUtils.Commands;
import resources = tacoUtils.ResourcesManager;
import logger = tacoUtils.Logger;

/*
 * InstallDependencies
 *
 * handles "taco install-dependencies"
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
            return Q.reject(err.message);
        }

        return new dependenciesInstaller.DependenciesInstaller().run(parsed);
    }

    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
        return true;
    }

    private parseArguments(args: commands.ICommandData): commands.ICommandData {
        return utils.parseArguments(InstallDependencies.KnownOptions, {}, args.original, 0);
    }

    private verifyArguments(data: commands.ICommandData): void {
        // Exactly 1 platform name must be specified
        if (data.remain.length != 0) {
            logger.logErrorLine(resources.getString("command.installDependencies.onlyOnePlatform"));

            throw new Error("command.installDependencies.onlyOnePlatform");
        }
    }
}

export = InstallDependencies;