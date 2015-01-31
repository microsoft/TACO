/// <reference path="../typings/node.d.ts" />
declare module TacoUtility {
    class ResourcesManager {
        static resources: any;
        static defaultLanguage: string;
        static init(language: string, resourcesDir?: string): void;
        /**** ...optionalArgs is only there for typings, function rest params***/
        static getString(id: string, ...optionalArgs: any[]): string;
        static bestLanguageMatchOrDefault(language: string, resourcesDir: string): string;
        static loadLanguage(language: string, resourcesDir: string): any;
        static getOptionalArgsArrayFromFunctionCall(functionArguments: IArguments, startFrom: number): any[];
    }
}
declare module "taco-utils"{
export = TacoUtility;
}
