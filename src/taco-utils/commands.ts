/// <reference path="../typings/node.d.ts" />
import fs = require ("fs");
import path = require ("path");
import tacoUtility = require ("./resources-manager");
import resourcesManager = tacoUtility.ResourcesManager;

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

        /**
         * Base command class, all other commands inherit from this
         */
        export interface ICommand {
            info: ICommandInfo;
            run(args: string[]): void;
            canHandleArgs(args: string[]): boolean;
        }

        /**
         * Factory to create new Commands classes
         */
        export class CommandFactory {
            private static Instance: ICommand;
            public static Listings: any;

            /**
             * Factory to create new Commands classes
             * initialize with json file containing commands
             */
            public static init(commandsInfoPath: string): void {
                commandsInfoPath = path.resolve(commandsInfoPath);
                if (!fs.existsSync(commandsInfoPath)) {
                    throw new Error(resourcesManager.getString("taco-utils.exception.listingfile"));
                }

                CommandFactory.Listings = require(commandsInfoPath);
            }

            /**
             * get specific task object, given task name
             */
            public static getTask(name: string, inputArgs: string[]): ICommand {
                if (!name || !CommandFactory.Listings) {
                    throw new Error(resourcesManager.getString("taco-utils.exception.listingfile"));
                }

                var moduleInfo: ICommandInfo = CommandFactory.Listings[name];
                if (!moduleInfo) {
                    return null;
                }

                var modulePath = path.resolve(moduleInfo.modulePath);
                if (!fs.existsSync(modulePath + ".js")) {
                    throw new Error(resourcesManager.getString("taco-utils.exception.missingcommand", name));
                }

                var commandMod: any = require(modulePath);
                CommandFactory.Instance = new commandMod();
                CommandFactory.Instance.info = moduleInfo;

                if (CommandFactory.Instance && CommandFactory.Instance.canHandleArgs(inputArgs)) {
                    return CommandFactory.Instance;
                } else {
                    return null;
                }
            }
        }
    }
}

export = TacoUtility;