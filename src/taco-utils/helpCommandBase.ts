/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

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
import logger = require ("./logger");
import loggerHelper = require ("./loggerHelper");
import resourceManager = require ("./resourceManager");
import resources = require ("./resources/resourceManager");
import telemetryHelper = require ("./telemetryHelper");

import CommandsFactory = commands.Commands.CommandFactory;
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
        private static DefaultBullet: string = "*";
        private static OptionIndent: number = 5;

        private commandsFactory: CommandsFactory = null;
        private cliResources: ResourceManager = null;
        private cliName: string = null;
        public info: ICommandInfo;

        constructor(cliName: string, commandJsonPath: string, resources: ResourceManager) {
            super();
            this.cliName = cliName;
            this.commandsFactory = new CommandsFactory(commandJsonPath);
            this.cliResources = resources;
        }

        public canHandleArgs(data: ICommandData): boolean {
            if (!data.original || data.original.length === 0) {
                return true;
            }

            return this.commandExists(data.original[0]);
        }

        /**
         * entry point for printing helper
         */
        public run(data: ICommandData): Q.Promise<any> {
            if (data.original && data.original.length > 0 && this.commandExists(data.original[0])) {
                this.printCommandUsage(data.original[0]);
            } else {
                this.printGeneralUsage();
            }
            
            TelemetryHelper.sendBasicCommandTelemetry("help", data.original);
            return Q({});
        }

        /**
         * prints out general usage of all support TACO commands, iterates through commands and their descriptions
         */
        private printGeneralUsage(): void {
            var programDescription: string = this.cliResources.getString("ProgramDescription");
            if (programDescription) {
                Logger.log(programDescription); // If we have a ProgramDescription we use the new format
                Logger.logLine();
            } else {
                Logger.log(resources.getString("CommandHelpUsageSynopsis")); // If not we fall-back to the old synopsis format
            }

            Logger.log(util.format("   <synopsis>%s %s</synopsis><br/>", this.cliName, "<COMMAND>"));

            Logger.log(resources.getString("CommandHelpTableTitle"));

            var nameDescriptionPairs: INameDescription[] = new Array();
            for (var i in this.commandsFactory.listings) {
                nameDescriptionPairs.push({ name: i, description: this.commandsFactory.listings[i].description });
            }

            this.printCommandTable(nameDescriptionPairs);
        }

        /**
         * prints out specific usage, i.e. TACO help create
         * @param {string} command - TACO command being inquired
         */
        private printCommandUsage(command: string): void {
            if (!this.commandsFactory.listings || !this.commandsFactory.listings[command]) {
                Logger.logError(resources.getString("CommandHelpBadcomand", "'" + command + "'"));
                this.printGeneralUsage();
                return;
            }

            // Prepare a flattened list of name/description values of args and options for each of the args.
            // The list will contain <arg1>, <arg2.options>, <arg2>, <arg2.options>, <arg3>, <arg3.options>
            var argList: INameDescription[] = [];
            var args: any[] = this.commandsFactory.listings[command].args;
            var list: ICommandInfo = this.commandsFactory.listings[command];
            this.printCommandHeader(this.cliName, command, list.synopsis, list.description);
            var optionsLeftIndent: string = Array(HelpCommandBase.OptionIndent + 1).join(" ");
            if (args) {
                args.forEach(arg => {
                    // Push the arg first
                    argList.push({
                        name: arg.name,
                        description: arg.description
                    });
                    if (arg.options) {
                        var options: INameDescription[] = <INameDescription[]>arg.options;
                        options.forEach(nvp => {
                            nvp.name = optionsLeftIndent + nvp.name;
                            argList.push({
                                name: nvp.name,
                                description: nvp.description
                            });
                        });
                    }
                });
                list.args = argList;
            }

            // if both needs to be printed we need to calculate an indent ourselves
            // to make sure args.values have same indenation as options.values
            // we need to also account for extra indenation given to options
            var longestArgsLength: number = LoggerHelper.getLongestNameLength(list.args);
            var longestOptionsLength: number = LoggerHelper.getLongestNameLength(list.options);
            var longestKeyLength: number = Math.max(longestArgsLength, longestOptionsLength + LoggerHelper.DefaultIndent);
            var indent2 = LoggerHelper.getDescriptionColumnIndent(longestKeyLength);

            if (list.args) {
                this.printCommandTable(list.args, LoggerHelper.DefaultIndent, indent2);
            }

            if (list.options) {
                Logger.log(resources.getString("CommandHelpUsageOptions"));
                this.printCommandTable(list.options, 2 * LoggerHelper.DefaultIndent, indent2);
            }

            if (list.aliases) {
                Logger.log(resources.getString("CommandHelpUsageAliases"));
                this.printAliasTable(list.aliases);
            }

            this.printExamples(list.examples);
            this.printNotes(list.notes);
        }

        private printCommandTable(nameDescriptionPairs: INameDescription[], indent1?: number, indent2?: number): void {
            for (var i = 0; i < nameDescriptionPairs.length; i++) {
                nameDescriptionPairs[i].description = this.getDescriptionString(nameDescriptionPairs[i].description);
            }

            LoggerHelper.logNameDescriptionTable(nameDescriptionPairs, indent1, indent2);
        }

        private printExamples(examples: ICommandExample[]): void {
            if (examples) {
                Logger.log(resources.getString("CommandHelpUsageExamples"));
                var indent: string = LoggerHelper.repeat(" ", LoggerHelper.DefaultIndent);
                var indent2: string = LoggerHelper.repeat(" ", 2 * LoggerHelper.DefaultIndent);
                for (var i = 0; i < examples.length; i++) {
                    Logger.log(util.format("%s%s %s", indent, HelpCommandBase.DefaultBullet, this.getDescriptionString(examples[i].description)));
                    Logger.logLine();
                    if (typeof examples[i].example === "string") {
                        Logger.log(util.format("%s  %s", indent2, examples[i].example));
                    } else {
                        LoggerHelper.printJson(<any>examples[i].example, 2 * LoggerHelper.DefaultIndent);
                    }

                    Logger.logLine();
                }
            }
        }

        private printNotes(notes: string[]): void {
            if (notes) {
                Logger.log(resources.getString("CommandHelpUsageNotes"));
                var indent: string = LoggerHelper.repeat(" ", LoggerHelper.DefaultIndent);
                for (var i = 0; i < notes.length; i++) {
                    var bullet: string = (notes.length > 1) ? (i + 1) + "." : HelpCommandBase.DefaultBullet;
                    Logger.log(util.format("%s%s %s", indent, bullet, this.getDescriptionString(notes[i])));
                    Logger.logLine();
                }
            }
        }

        private printCommandHeader(cliName: string, commandName: string, synopsis: string, description?: string): void {
            if (synopsis) {
                Logger.log(resources.getString("CommandHelpUsageSynopsis"));
                Logger.log(util.format("   <synopsis>%s %s %s</synopsis><br/>", cliName, commandName, synopsis));
            }

            if (description) {
                Logger.log(this.getDescriptionString(description) + "<br/>");
            }
        }

        private printAliasTable(commandAliases: ICommandAlias[]): void {
            var leftIndent: string = Array(LoggerHelper.DefaultIndent + 1).join(" ");
            commandAliases.forEach(cmdAliasPair => {
                Logger.log(util.format("%s<key>%s</key> %s <key>%s</key>", leftIndent, cmdAliasPair.alias, "->", cmdAliasPair.command));
            });
        }

        /**
         * helper function to strip out square brackets from  ["abc"] and get string from resources.json
         * if no bracket, just return the string
         * @param {string} id - string to get
         */
        private getDescriptionString(id: string): string {
            var regex: RegExp = new RegExp("(\\[.*\\])");
            var res: ResourceManager = this.cliResources;
            return id.replace(regex, function (id: string): string {
                id = id.slice(1, id.length - 1);
                return res.getString(id);
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
}

export = TacoUtility;
