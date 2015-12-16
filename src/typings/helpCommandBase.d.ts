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
         * Concrete implementation of ICommand's run
         * Parse the arguments using overridden parseArgs, and then select the most appropriate subcommand to run
         */
        protected runCommand(): Q.Promise<any>;
    }
}
