/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/Q.d.ts" />
declare module TacoUtility {
    module Commands {
        interface INameDescription {
            name: string;
            description: string;
        }
        interface ICommandInfo {
            synopsis: string;
            modulePath: string;
            description: string;
            args: INameDescription[];
            options: INameDescription[];
        }
        interface ICommandData {
            options: {
                [flag: string]: any;
            };
            original: string[];
            remain: string[];
        }

        /**
         * Base command class, all other commands inherit from this
         */
        interface ICommand {
            run(data: ICommandData): Q.Promise<any>;
            canHandleArgs(data: ICommandData): boolean;
        }
        interface IDocumentedCommand extends ICommand {
            info: ICommandInfo;
        }
        /**
         * Factory to create new Commands classes
         */
        class CommandFactory {
            public listings: any;
            /**
             * initialize with json file containing commands
             */
            constructor(commandsInfoPath: string);
            /**
             * get specific task object, given task name
             */
            public getTask(name: string, inputArgs: string[], commandsModulePath: string): IDocumentedCommand;
        }

        class TacoCommandBase implements ICommand {
            public name: string;
            public subcommands: ICommand[];
            public info: ICommandInfo;

            /**
             * Abstract method to be implemented by derived class.
             * Convert command line arguments into an appropriate format to determine what action to take
             */
            public parseArgs(args: string[]): ICommandData
            /**
             * Abstract method to be implemented by derived class.
             * Sanity check on arguments to determine whether to pass through to cordova
             */
            public canHandleArgs(data: ICommandData): boolean;
            /**
             * Concrete implementation of ICommand's run
             * Parse the arguments using overridden parseArgs, and then select the most appropriate subcommand to run
             */
            public run(data: ICommandData): Q.Promise<any>;
        }
    }
}
