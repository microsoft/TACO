/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../typings/commandExample.d.ts" />
/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/commandAlias.d.ts" />

import fs = require ("fs");
import path = require ("path");
import Q = require ("q");

import logger = require ("./logger");
import resources = require ("./resources/resourceManager");
import tacoErrorCodes = require ("./tacoErrorCodes");
import telemetryHelper = require ("./telemetryHelper");
import errorHelper = require ("./tacoErrorHelper");

import TacoErrorCodes = tacoErrorCodes.TacoErrorCode;
import ICommandTelemetryProperties = telemetryHelper.ICommandTelemetryProperties;

module TacoUtility {
    export module Commands {
        export interface ICommandInfo {
            synopsis: string;
            modulePath: string;
            description: string;
            args: INameDescription[];
            options: INameDescription[];
            examples: ICommandExample[];
            notes: string[];
            aliases: ICommandAlias;
        }

        export interface ICommandData {
            options: {
                [flag: string]: any;
            };
            original: string[];
            remain: string[];
        };

        /**
         * Base command class, all other commands inherit from this
         */
        export interface ICommand {
            name: String;
            run(args: string[]): Q.Promise<ICommandTelemetryProperties>;
            canHandleArgs(data: ICommandData): boolean;
        }

        export interface ISubCommand {
            name: String;
            canHandleArgs?(data: ICommandData): boolean;
            run(data: ICommandData): Q.Promise<ICommandTelemetryProperties>;
        }

        export class TacoCommandBase implements ICommand {
            public name: string;
            public subcommands: ISubCommand[];
            public info: ICommandInfo;
            public data: ICommandData;

            /**
             * Abstract method to be implemented by derived class.
             * Convert command line arguments into an appropriate format to determine what action to take
             */
            public parseArgs(args: string[]): ICommandData {
                throw errorHelper.get(TacoErrorCodes.AbstractMethod);
            }

            /**
             * Abstract method to be implemented by derived class.
             * Sanity check on arguments to determine whether to pass through to cordova
             */
            public canHandleArgs(data: ICommandData): boolean {
                throw errorHelper.get(TacoErrorCodes.AbstractMethod);
            }

            public run(args: string[]): Q.Promise<ICommandTelemetryProperties> {
                try {
                    this.data = this.parseArgs(args);
                    return this.runCommand(this.data);
                } catch (err) {
                    return Q.reject<ICommandTelemetryProperties>(err);
                }
            }

            /**
             * Concrete implementation of ICommand's run
             * Parse the arguments using overridden parseArgs, and then select the most appropriate subcommand to run
             */
            protected runCommand(data: ICommandData): Q.Promise<ICommandTelemetryProperties> {
                // Determine which subcommand we are executing
                var subCommand = this.getSubCommand(this.data);
                if (subCommand) {
                    return subCommand.run(this.data);
                }
                return Q.reject<ICommandTelemetryProperties>(errorHelper.get(TacoErrorCodes.CommandBadSubcommand, this.name, this.data.original.toString()));
            }

            public resolveAlias(subCommand: string): string {
                return (this.info.aliases && this.info.aliases[subCommand]) ? this.info.aliases[subCommand] : subCommand;
            }

            private getSubCommand(options: ICommandData): ISubCommand {
                // first do a simple name match
                var name: string = options.remain[0];
                name = name ? this.resolveAlias(name) : name;
                for (var i: number = 0; i < this.subcommands.length; ++i) {
                    if (name === this.subcommands[i].name) {
                        return this.subcommands[i];
                    }
                }
                // if subcommand has specified a canHandleArgs, check if there is a subcommand
                // which can handle the args
                for (var i: number = 0; i < this.subcommands.length; ++i) {
                    var subCommand: ISubCommand = this.subcommands[i];
                    if (subCommand.canHandleArgs && subCommand.canHandleArgs(options)) {
                        return subCommand;
                    }
                }

                return null;
            }
        }

        /**
         * Factory to create new Commands classes
         */
        export class CommandFactory {
            public listings: any;
            public aliases: any;

            /**
             * Factory to create new Commands classes
             * initialize with json file containing commands
             */
            constructor(commandsInfoPath: string) {
                if (!fs.existsSync(commandsInfoPath)) {
                    throw errorHelper.get(TacoErrorCodes.TacoUtilsExceptionListingfile);
                }

                this.listings = require(commandsInfoPath).commands;
                this.aliases = require(commandsInfoPath).aliases;
            }

            /**
             * get specific task object, given task name
             */
            public getTask(name: string, inputArgs: string[], commandsModulePath: string): TacoCommandBase {
                if (!name || !this.listings) {
                    throw errorHelper.get(TacoErrorCodes.TacoUtilsExceptionListingfile);
                }

                var moduleInfo: ICommandInfo = this.listings[name];
                if (!moduleInfo) {
                    // Check if {name} is a command alias
                    var commandForAlias: string = this.aliases ? this.aliases[name] : null;
                    if (commandForAlias) {
                        moduleInfo = this.listings[commandForAlias];
                    } else {
                        return null;
                    }
                }

                var modulePath: string = path.join(commandsModulePath, moduleInfo.modulePath);
                if (!fs.existsSync(modulePath + ".js")) {
                    throw errorHelper.get(TacoErrorCodes.TacoUtilsExceptionMissingcommand, name);
                }

                var commandMod: any = require(modulePath);
                var moduleInstance: any = new commandMod();
                moduleInstance.info = moduleInfo;

                var commandData: ICommandData = { options: {}, original: inputArgs, remain: inputArgs };
                if (moduleInstance && moduleInstance.canHandleArgs(commandData)) {
                    return moduleInstance;
                }
                return null;
            }
        }
    }
}

export = TacoUtility;
