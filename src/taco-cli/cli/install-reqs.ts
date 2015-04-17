/// <reference path="../../typings/taco-utils.d.ts" />
"use strict";

import tacoUtility = require ("taco-utils");
import utils = tacoUtility.UtilHelper;
import commands = tacoUtility.Commands;
import resources = tacoUtility.ResourcesManager;
import logger = tacoUtility.Logger;
import level = logger.Level;
import cordovaWrapper = require ("./utils/cordova-wrapper");
import Q = require ("q");

/*
 * InstallReqs
 *
 * handles "taco install-reqs"
 */
class InstallReqs implements commands.IDocumentedCommand {
    private static KnownOptions: Nopt.FlagTypeMap = {
        kit: String,
        template: String,
        cli: String,
        "copy-from": String,
        "link-to": String
    };

    public info: commands.ICommandInfo;

    public run(data: commands.ICommandData): Q.Promise<any> {
        var commandData: commands.ICommandData = utils.parseArguments(InstallReqs.KnownOptions, {}, data.original, 0);

        return Q.resolve({});
    }

    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
        return true;
    }
}