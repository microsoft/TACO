/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/colors.d.ts" />
declare module TacoUtility {
    module Logger {
        /**
         * Warning levels
         */
        enum Level {
            Warn = 0,
            Error = 1,
            Link = 2,
            Normal = 3,
            Success = 4,
            NormalBold = 5,
        }
        /**
         * returns colorized string
         * wrapping "colors" module because not yet possible to combine themes, i.e. ["yellow", "bold"]:  https://github.com/Marak/colors.js/issues/72
         */
        function colorize(msg: string, level: Level): string;
        /**
         * log
         */
        function log(msg: string, level: Level): void;
        /**
         * for quick logging use
         */
        function logLine(msg: string, level: Level): void;
        function logErrorLine(msg: string): void;
        function logWarnLine(msg: string): void;
        function logLinkLine(msg: string): void;
        function logNormalLine(msg: string): void;
        function logNormalBoldLine(msg: string): void;
        function logSuccessLine(msg: string): void;
    }
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
            private static args;
            static Listings: any;
            private static Instance;
            /**
             * Factory to create new Commands classes
             * initialize with json file containing commands
             */
            static init(commandsInfoPath: string): void;
            /**
             * get specific task object, given task name
             */
            static getTask(name: string, inputArgs: string[]): ICommand;
        }
    }
    class ResourcesManager {
        private static Resources;
        private static DefaultLanguage;
        static init(language: string, resourcesDir?: string): void;
        static getString(id: string, ...optionalArgs: any[]): string;
        static bestLanguageMatchOrDefault(language: string, resourcesDir: string): string;
        static loadLanguage(language: string, resourcesDir: string): any;
        static getOptionalArgsArrayFromFunctionCall(functionArguments: IArguments, startFrom: number): any[];
    }
}
declare module "taco-utils"{
export = TacoUtility;
}
