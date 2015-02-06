/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/colors.d.ts" />
declare module TacoUtility {
    module Logger {
        enum Level {
            Warn = 0,
            Error = 1,
            Link = 2,
            Normal = 3,
            Success = 4,
            NormalBold = 5,
        }
        function colorize(msg: string, level: Level): string;
        function logNewLine(msg: string, level: Level): void;
        /**
         *
         *
         */
        function log(msg: string, level: Level): void;
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
        class Command {
            info: ICommandInfo;
            cliArgs: string[];
            constructor(info: ICommandInfo);
            run(): void;
        }
        class CommandFactory {
            static Listings: any;
            private static Instance;
            static init(commandsInfoPath: string): void;
            static getTask(name: string): Command;
            static runTask(): void;
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
