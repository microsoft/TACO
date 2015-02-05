/// <reference path="../typings/node.d.ts" />
declare module TacoUtility {
    module Commands {
        interface INameDescription {
            name: string;
            description: string;
        }
        interface ICommandInfo {
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
            private static Listings;
            private static Instance;
            static CommandsInfoFile: string;
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
