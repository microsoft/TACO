/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/tacoUtils.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/colors.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />
/// <reference path="../../typings/nameDescription.d.ts" />

"use strict";
import path = require ("path");
import Q = require ("q");
import util = require ("util");

import resources = require ("../resources/resourceManager");
import tacoUtility = require ("taco-utils");

import CommandsFactory = tacoUtility.Commands.CommandFactory;
import commands = tacoUtility.Commands;
import logger = tacoUtility.Logger;
import LoggerHelper = tacoUtility.LoggerHelper;

/*
 * Help
 *
 * handles "Taco Help"
 */
class Help implements commands.IDocumentedCommand {
    private static TacoString: string = "taco";
    private commandsFactory: CommandsFactory = null;

    public info: commands.ICommandInfo;

    constructor() {
        this.commandsFactory = new CommandsFactory(path.join(__dirname, "./commands.json"));
    }

    public canHandleArgs(data: commands.ICommandData): boolean {
        if (!data.original || data.original.length === 0) {
            return true;
        }

        return this.commandExists(data.original[0]);
    }

    /**
     * entry point for printing helper
     */ 
    public run(data: commands.ICommandData): Q.Promise<any> {
        this.printHeader();
        if (data.original && data.original.length > 0 && this.commandExists(data.original[0])) {
            this.printCommandUsage(data.original[0]);
        } else {
            this.printGeneralUsage();
        }

        return Q({});
    }

    /**
     * prints out Microsoft header
     */
    public printHeader(): void {
        logger.log("<br/>=================================================================");
    }

    /**
     * prints out general usage of all support TACO commands, iterates through commands and their descriptions
     */
    public printGeneralUsage(): void {
        Help.printCommandHeader(resources.getString("CommandHelpTacoUsage"));

        var nameValuePairs: INameDescription[] = new Array();
        for (var i in this.commandsFactory.listings) {
            nameValuePairs.push({
                name: i,
                description: this.commandsFactory.listings[i].description
            });
        }

        Help.printCommandTable(nameValuePairs);
    }

    /**
     * prints out specific usage, i.e. TACO help create
     * @param {string} command - TACO command being inquired
     */
    public printCommandUsage(command: string): void {
        if (!this.commandsFactory.listings || !this.commandsFactory.listings[command]) {
            logger.logError(resources.getString("CommandHelpBadcomand", "'" + command + "'"));
            this.printGeneralUsage();
            return;
        }

        var list: tacoUtility.Commands.ICommandInfo = this.commandsFactory.listings[command];
        Help.printCommandHeader(util.format("%s %s %s", Help.TacoString, command, list.synopsis), list.description);

        // if both needs to be printed we need to calculate an indent ourselves
        // to make sure args.values have same indenation as options.values
        // we need to also account for extra indenation given to options
        var maxKeyLength: number = 0;
        if (list.args) {
            list.args.forEach(nvp => {
                if (nvp.name.length > maxKeyLength) {
                    maxKeyLength = nvp.name.length;
                }
            });
        }

        if (list.options) {
            list.options.forEach(nvp => {
                if ((nvp.name.length + LoggerHelper.DefaultIndent) > maxKeyLength) {
                    maxKeyLength = nvp.name.length + LoggerHelper.DefaultIndent;
                }
            });
        }

        var indent2 = Math.max(LoggerHelper.DefaultIndent + maxKeyLength + LoggerHelper.MinimumDots + 2, LoggerHelper.MinRightIndent);
        if (list.args) {
            Help.printCommandTable(list.args, LoggerHelper.DefaultIndent, indent2);
        }

        if (list.options) {
            logger.log(resources.getString("CommandHelpUsageOptions"));
            Help.printCommandTable(list.options, 2 * LoggerHelper.DefaultIndent, indent2);
        }
    }

    private static printCommandTable(nameValuePairs: INameDescription[], indent1?: number, indent2?: number): void {
        nameValuePairs.forEach(nvp => {
            nvp.description = Help.getDescriptionString(nvp.description);
        });
        LoggerHelper.logNameValueTable(nameValuePairs, indent1, indent2);
    }

    private static printCommandHeader(synopsis: string, description?: string): void {
        logger.log(resources.getString("CommandHelpUsageSynopsis"));
        logger.log(util.format("   <synopsis>%s</synopsis><br/>", synopsis));
        if (description) {
            logger.log(Help.getDescriptionString(description) + "<br/>");
        }
    }

    /**
     * helper function to strip out square brackets from  ["abc"] and get string from resources.json
     * if no bracket, just return the string
     * @param {string} id - string to get
     */
    private static getDescriptionString(id: string): string {
        var regex: RegExp = new RegExp("(\\[.*\\])");
        return id.replace(regex, function (id: string): string {
            id = id.slice(1, id.length - 1);
            return resources.getString(id);
        });
    }

    /**
     * looks up commands.json and see if command is authored as supported
     * @param {string} id - command to query
     */
    private commandExists(command: string): boolean {
        for (var i in this.commandsFactory.listings) {
            if (i === command) {
                return true;
            }
        }

        return false;
    }
}

export = Help;
