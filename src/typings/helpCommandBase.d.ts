/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/commands.d.ts" />

declare module TacoUtility {
    class HelpCommandBase extends TacoUtility.Commands.TacoCommandBase {
        public info: TacoUtility.Commands.ICommandInfo;

        constructor(cliName: string, commandJsonPath: string, resources: ResourceManager);

        /**
         * Abstract method to be implemented by derived class.
         * Convert command line arguments into an appropriate format to determine what action to take
         */
        public parseArgs(args: string[]): TacoUtility.Commands.ICommandData
        /**
         * Abstract method to be implemented by derived class.
         * Sanity check on arguments to determine whether to pass through to cordova
         */
        public canHandleArgs(data: TacoUtility.Commands.ICommandData): boolean;
        /**
         * Concrete implementation of ICommand's run
         * Parse the arguments using overridden parseArgs, and then select the most appropriate subcommand to run
         */
        public run(data: TacoUtility.Commands.ICommandData): Q.Promise<any>;
    }
}
