/// <reference path="../typings/node.d.ts" />
declare module TacoUtility {
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
