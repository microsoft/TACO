/// <reference path="../typings/node.d.ts" />
declare module TacoUtility {
    class ResourcesManager {
        private static _instance;
        private resources;
        private defaultLanguage;
        static getInstance(): ResourcesManager;
        constructor();
        init(language: string, resourcesDir?: string): void;
        /**** ...optionalArgs is only there for typings, function rest params***/
        getString(id: string, ...optionalArgs: any[]): string;
        bestLanguageMatchOrDefault(language: string, resourcesDir: string): string;
        loadLanguage(language: string, resourcesDir: string): any;
        getOptionalArgsArrayFromFunctionCall(functionArguments: IArguments, startFrom: number): any[];
    }
}

declare module "taco-utils" {
    export = TacoUtility;
}
