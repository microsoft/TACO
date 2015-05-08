/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/Q.d.ts" />
import fs = require ("fs");
import path = require ("path");
import Q = require ("q");

import logger = require ("./logger");
import resources = require ("./resources/resourceManager");
import utilHelper = require ("./utilHelper");

import UtilHelper = utilHelper.UtilHelper;

module TacoUtility {
    export module Commands {
        export interface INameDescription {
            name: string;
            description: string;
        }

        export interface ICommandInfo {
            synopsis: string;
            modulePath: string;
            description: string;
            args: INameDescription[];
            options: INameDescription[];
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
            run(data: ICommandData): Q.Promise<any>;
            canHandleArgs(data: ICommandData): boolean;
        }
        export interface IDocumentedCommand extends ICommand {
            info: ICommandInfo;
        }

        /**
         * Factory to create new Commands classes
         */
        export class CommandFactory {
            private static Instance: IDocumentedCommand;
            public static Listings: any;

            /**
             * Factory to create new Commands classes
             * initialize with json file containing commands
             */
            public static init(commandsInfoPath: string): void {
                commandsInfoPath = commandsInfoPath;
                if (!fs.existsSync(commandsInfoPath)) {
                    throw new Error(resources.getString("tacoUtilsExceptionListingfile"));
                }

                CommandFactory.Listings = require(commandsInfoPath);
            }

            /**
             * get specific task object, given task name
             */
            public static getTask(name: string, inputArgs: string[], commandsModulePath: string): IDocumentedCommand {
                if (!name || !CommandFactory.Listings) {
                    throw new Error(resources.getString("tacoUtilsExceptionListingfile"));
                }

                var moduleInfo: ICommandInfo = CommandFactory.Listings[name];
                if (!moduleInfo) {
                    return null;
                }

                var modulePath = path.join(commandsModulePath, moduleInfo.modulePath);
                if (!fs.existsSync(modulePath + ".js")) {
                    throw new Error(resources.getString("tacoUtilsExceptionMissingcommand", name));
                }

                var commandMod: any = require(modulePath);
                CommandFactory.Instance = new commandMod();
                CommandFactory.Instance.info = moduleInfo;

                var commandData: ICommandData = {
                    options: {},
                    original: inputArgs,
                    remain: inputArgs
                };

                if (CommandFactory.Instance && CommandFactory.Instance.canHandleArgs(commandData)) {
                    return CommandFactory.Instance;
                } else {
                    return null;
                }
            }
        }

        export class TacoCommandBase implements ICommand {
            public name: string;
            public subcommands: ICommand[];
            public info: ICommandInfo;

            /**
             * Abstract method to be implemented by derived class.
             * Convert command line arguments into an appropriate format to determine what action to take
             */
            public parseArgs(args: string[]): ICommandData {
                throw new Error("abstractMethod");
            }

            /**
             * Abstract method to be implemented by derived class.
             * Sanity check on arguments to determine whether to pass through to cordova
             */
            public canHandleArgs(data: ICommandData): boolean {
                throw new Error("abstractMethod");
            }

            /**
             * Concrete implementation of ICommand's run
             * Parse the arguments using overridden parseArgs, and then select the most appropriate subcommand to run
             */
            public run(data: ICommandData): Q.Promise<any> {
                var commandData = this.parseArgs(data.original);

                // Determine which build subcommand we are doing
                var subcommand = this.getSubCommand(commandData);
                if (subcommand) {
                    return subcommand.run(commandData);
                } else {
                    logger.Logger.logErrorLine(resources.getString("commandBadArguments", this.name, commandData.original.toString()));
                    return Q.reject(new Error("commandBadArguments"));
                }
            }

            private getSubCommand(options: ICommandData): ICommand {
                for (var i = 0; i < this.subcommands.length; ++i) {
                    var subCommand = this.subcommands[i];
                    if (subCommand.canHandleArgs(options)) {
                        return subCommand;
                    }
                }

                return null;
            }
        }
    }
}

export = TacoUtility;
