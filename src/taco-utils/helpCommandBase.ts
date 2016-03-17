// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/// <reference path="../typings/colors.d.ts" />
/// <reference path="../typings/commandAlias.d.ts" />
/// <reference path="../typings/commandExample.d.ts" />
/// <reference path="../typings/nameDescription.d.ts" />
/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/nopt.d.ts" />
/// <reference path="../typings/tacoUtils.d.ts" />

"use strict";
import path = require ("path");
import Q = require ("q");
import util = require ("util");

import commands = require ("./commands");
import cordovaWrapper = require ("./cordovaWrapper");
import logger = require ("./logger");
import loggerHelper = require ("./loggerHelper");
import resourceManager = require ("./resourceManager");
import resources = require ("./resources/resourceManager");
import telemetryHelper = require ("./telemetryHelper");

import CommandsFactory = commands.Commands.CommandFactory;
import CordovaWrapper = cordovaWrapper.CordovaWrapper;
import ICommandData = commands.Commands.ICommandData;
import ICommandInfo = commands.Commands.ICommandInfo;
import TacoCommandBase = commands.Commands.TacoCommandBase;
import Logger = logger.Logger;
import LoggerHelper = loggerHelper.LoggerHelper;
import ResourceManager = resourceManager.ResourceManager;
import TelemetryHelper = telemetryHelper.TelemetryHelper;

module TacoUtility {
    /*
     * Help
     *
     * handles "Taco Help"
     */
    export class HelpCommandBase extends TacoCommandBase {
        private static DEFAULT_BULLET: string = "*";
        private static OPTIONS_INDENT: number = 5;

        public info: ICommandInfo;

        private commandsFactory: CommandsFactory = null;
        private cliResources: ResourceManager = null;
        private cliName: string = null;

        constructor(cliName: string, commandJsonPath: string, resources: ResourceManager) {
            super();
            this.cliName = cliName;
            this.commandsFactory = new CommandsFactory(commandJsonPath);
            this.cliResources = resources;
        }

        public parseArgs(args: string[]): ICommandData {
            return { options: {}, original: args, remain: args };
        }

        /**
         * entry point for printing helper
         */
        protected runCommand(): Q.Promise<any> {
            if (this.data.original && this.data.original.length > 0) {
                if (this.commandExists(this.data.original[0])) {
                    this.printCommandUsage(this.data.original[0]);
                } else {
                    var args = this.data.original;
                    args.unshift("help");
                    CordovaWrapper.cli(args);
                }
            } else {
                this.printGeneralUsage();
            }

            return Q({});
        }

        /**
         * prints out general usage of all support TACO commands, iterates through commands and their descriptions
         */
        private printGeneralUsage(): void {
            var programDescription: string = this.cliResources.getString("ProgramDescription");
            if (programDescription) {
                Logger.logLine();
                Logger.log(programDescription); // If we have a ProgramDescription we use the new format
                Logger.logLine();
            } else {
                Logger.log(resources.getString("CommandHelpUsageSynopsis")); // If not we fall-back to the old synopsis format
            }

            Logger.log(util.format("   <synopsis>%s %s</synopsis><br/>", this.cliName, "<COMMAND>"));

            var nameDescriptionPairs: INameDescription[] = new Array();

            var listings: any = this.commandsFactory.listings;
            Object.keys(listings).forEach(function(i: string): void {
                nameDescriptionPairs.push({ name: i, description: listings[i].description, category: listings[i].categoryTitle });
            });

            // we use first entry to conclude if command table has categories
            if (nameDescriptionPairs.length > 0 && !nameDescriptionPairs[0].category) {
                Logger.log(resources.getString("CommandHelpTableTitle"));
            }

            this.printCommandTable(nameDescriptionPairs);
        }

        /**
         * prints out specific usage, i.e. taco help create
         * @param {string} command - TACO command being inquired
         */
        private printCommandUsage(command: string): void {
            if (this.commandsFactory.aliases && this.commandsFactory.aliases[command]) {
                command = this.commandsFactory.aliases[command];
            }

            if (!this.commandsFactory.listings || !this.commandsFactory.listings[command]) {
                Logger.logError(resources.getString("CommandHelpBadcomand", "'" + command + "'"));
                this.printGeneralUsage();
                return;
            }

            var list: ICommandInfo = this.commandsFactory.listings[command];

            this.printCommandHeader(this.cliName, command, list.synopsis, list.description);

            list.args = HelpCommandBase.flattenNameValues(list.args);
            list.options = HelpCommandBase.flattenNameValues(list.options);

            // if both needs to be printed we need to calculate an indent ourselves
            // to make sure args.values have same indenation as options.values
            // we need to also account for extra indenation given to options
            var longestArgsLength: number = LoggerHelper.getLongestNameLength(list.args);
            var longestOptionsLength: number = LoggerHelper.getLongestNameLength(list.options);
            var longestKeyLength: number = Math.max(longestArgsLength, longestOptionsLength + LoggerHelper.DEFAULT_INDENT);
            var indent2: number = LoggerHelper.getDescriptionColumnIndent(longestKeyLength);

            if (list.args) {
                Logger.log(resources.getString("CommandHelpUsageParameters"));
                this.printCommandTable(list.args, LoggerHelper.DEFAULT_INDENT, indent2);
            }

            if (list.options) {
                Logger.log(resources.getString("CommandHelpUsageOptions"));
                this.printCommandTable(list.options, 2 * LoggerHelper.DEFAULT_INDENT, indent2);
            }

            if (list.aliases) {
                Logger.log(resources.getString("CommandHelpUsageAliases"));
                this.printAliasTable(list.aliases);
            }

            this.printExamples(list.examples);
            this.printNotes(list.notes);
        }

        private printCommandTable(nameDescriptionPairs: INameDescription[], indent1?: number, indent2?: number): void {
            for (var i: number = 0; i < nameDescriptionPairs.length; i++) {
                nameDescriptionPairs[i].description = this.getResourceString(nameDescriptionPairs[i].description);
                if (nameDescriptionPairs[i].category) {
                    nameDescriptionPairs[i].category = util.format("<highlight>%s</highlight>", this.getResourceString(nameDescriptionPairs[i].category));
                }
            }

            LoggerHelper.logNameDescriptionTable(nameDescriptionPairs, indent1, indent2);
        }

        private printExamples(examples: ICommandExample[]): void {
            if (examples) {
                Logger.log(resources.getString("CommandHelpUsageExamples"));
                var indent: string = LoggerHelper.repeat(" ", LoggerHelper.DEFAULT_INDENT);
                var indent2: string = LoggerHelper.repeat(" ", 2 * LoggerHelper.DEFAULT_INDENT);
                for (var i: number = 0; i < examples.length; i++) {
                    Logger.log(util.format("%s%s %s", indent, HelpCommandBase.DEFAULT_BULLET, this.getResourceString(examples[i].description)));
                    Logger.logLine();
                    if (typeof examples[i].example === "string") {
                        Logger.log(util.format("%s  <highlight>%s</highlight>", indent2, examples[i].example));
                    } else {
                        LoggerHelper.printJson(<any> examples[i].example, 2 * LoggerHelper.DEFAULT_INDENT);
                    }

                    Logger.logLine();
                }
            }
        }

        private printNotes(notes: string[]): void {
            if (notes) {
                Logger.log(resources.getString("CommandHelpUsageNotes"));
                var indent: string = LoggerHelper.repeat(" ", LoggerHelper.DEFAULT_INDENT);
                for (var i: number = 0; i < notes.length; i++) {
                    var bullet: string = (notes.length > 1) ? (i + 1) + "." : HelpCommandBase.DEFAULT_BULLET;
                    Logger.log(util.format("%s%s %s", indent, bullet, this.getResourceString(notes[i])));
                    Logger.logLine();
                }
            }
        }

        private printCommandHeader(cliName: string, commandName: string, synopsis: string, description?: string): void {
            Logger.logLine();
            if (description) {
                Logger.log(this.getResourceString(description));
            }

            if (synopsis) {
                Logger.logLine();
                var leftIndent: string = LoggerHelper.repeat(" ", LoggerHelper.DEFAULT_INDENT);
                Logger.log(util.format("%s<synopsis>%s %s %s</synopsis><br/>", leftIndent, cliName, commandName, synopsis));
            }
        }

        private printAliasTable(commandAliases: ICommandAlias): void {
            var leftIndent: string = LoggerHelper.repeat(" ", LoggerHelper.DEFAULT_INDENT);
            Object.keys(commandAliases).forEach((cmdKey: string) => {
                var value: string = commandAliases[cmdKey];
                if (value && value !== cmdKey) {
                    Logger.log(util.format("%s<key>%s</key> %s <key>%s</key>", leftIndent, cmdKey, "->", value));
                }
            });
        }

        /**
         * helper function to strip out square brackets from  ["abc"] and get string from resources.json
         * if no bracket, just return the string
         * @param {string} id - string to get
         */
        private getResourceString(id: string): string {
            var regex: RegExp = new RegExp("(\\[.*\\])");
            var res: ResourceManager = this.cliResources;
            return id.replace(regex, function (resourceId: string): string {
                resourceId = resourceId.slice(1, resourceId.length - 1);
                return res.getString(resourceId);
            });
        }

        /**
         * looks up commands.json and see if command is authored as supported
         * @param {string} id - command to query
         */
        private commandExists(command: string): boolean {
            return command in this.commandsFactory.listings || (this.commandsFactory.aliases && command in this.commandsFactory.aliases);
        }

        /**
         * Prepares a flattened list of name/description values of args and options for each of the args.
         */
        private static flattenNameValues(args: any[]): INameDescription[] {
            if (!args) {
                return undefined;
            }
        
            var optionsLeftIndent: string = LoggerHelper.repeat(" ", HelpCommandBase.OPTIONS_INDENT);

            var argList: INameDescription[] = [];
            args.forEach((arg: any) => {
                // Push the arg first
                argList.push({name: arg.name, description: arg.description});

                if (arg.options) {
                    var options: INameDescription[] = <INameDescription[]> arg.options;
                    options.forEach((nvp: INameDescription) => {
                        argList.push({name: optionsLeftIndent + nvp.name, description: nvp.description});
                    });
                }
            });
            return argList;
        }
    }
}

export = TacoUtility;
