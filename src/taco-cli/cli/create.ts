/// <reference path="../../typings/taco-utils.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />

import tacoUtility = require ("taco-utils");
import commands = tacoUtility.Commands;
import logger = tacoUtility.Logger;
import level = logger.Level;
import nopt = require ("nopt");
import Q = require ("q");

/*
 * Create
 *
 * handles "Taco Create"
 */
class Create implements commands.IDocumentedCommand {
    public info: commands.ICommandInfo;
    /**
     * Sample only, shows processing specific taco commands, and passing remaining ones to Cordova CLI
     */  
    public run(data: commands.ICommandData): Q.Promise<any> {
        logger.logErrorLine("Create not yet implemented");
        return Q.reject("Not yet implemented");
    }

    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */  
    public canHandleArgs(data: commands.ICommandData): boolean {
        return true;
    }
}

export = Create;