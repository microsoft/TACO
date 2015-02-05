/// <reference path="../typings/node.d.ts" />
declare module TacoUtility {
    module Commands {
        interface nameDescription {
            name: string;
            description: string;
        }
        interface CommandInfo {
            modulePath: string;
            description: string;
            args: nameDescription[];
            options: nameDescription[];
        }
        class Command {
            info: CommandInfo;
            constructor(input: CommandInfo);
            run(): void;
        }
        class CommandFactory {
            private static Listings;
            private static Instance;
            static init(commandsInfoPath: string): void;
            static getTask(name: string): Command;
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
