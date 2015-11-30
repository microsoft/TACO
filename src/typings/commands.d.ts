/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/nameDescription.d.ts" />
/// <reference path="../typings/commandAlias.d.ts" />
/// <reference path="../typings/telemetryHelper.d.ts" />
declare module TacoUtility {
    module Commands {
        interface ICommandInfo {
            synopsis: string;
            modulePath: string;
            description: string;
            args: INameDescription[];
            options: INameDescription[];
            syntax: INameDescription[];
            aliases: ICommandAlias;
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
            name: string;
            run(args: string[]): Q.Promise<ICommandTelemetryProperties>;
            canHandleArgs(data: ICommandData): boolean;
        }

        /**
         * interface used by sub-commands defined by ICommand implementations
         */
        interface ISubCommand<T extends TacoCommandBase> {
            name: String;
            canHandleArgs?(command: T, data: ICommandData): boolean;
            run(command: T, data: ICommandData): Q.Promise<ICommandTelemetryProperties>;
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
            public getTask(name: string, inputArgs: string[], commandsModulePath: string): TacoCommandBase;
        }

        class TacoCommandBase implements ICommand {
            public name: string;
            public executedSubcommand: ICommand;
            public subcommands: ISubCommand<TacoCommandBase>[];
            public info: ICommandInfo;
            public data: ICommandData;

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
            public run(args: string[]): Q.Promise<ICommandTelemetryProperties>;
            protected runCommand(data: ICommandData): Q.Promise<ICommandTelemetryProperties>;
            public resolveAlias(subCommand: string): string;
        }
    }
}
