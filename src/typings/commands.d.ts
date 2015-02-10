/// <reference path="../typings/node.d.ts" />
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
        /**
         * Base command class, all other commands inherit from this
         */
        interface ICommand {
            info: ICommandInfo;
            run(args: string[]): void;
            canHandleArgs(args: string[]): boolean;
        }
        /**
         * Factory to create new Commands classes
         */
        class CommandFactory {
            private static Instance;
            static Listings: any;
            /**
             * Factory to create new Commands classes
             * initialize with json file containing commands
             */
            static init(commandsInfoPath: string): void;
            /**
             * get specific task object, given task name
             */
            static getTask(name: string, inputArgs: string[], commandsModulePath: string): ICommand;
        }
    }
}
