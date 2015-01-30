/// <reference path="../typings/node.d.ts" />
//declare module TacoUtility {    
//    //put more classes definitions here, known limitation that classes definitions in external modules CANNOT span multiple files
//    export class Resources {
//        resources: any;
//        defaultLanguage: string;
//        constructor(language: string, resourcesDir?: string);
//        getString(id: string, ...optionalArgs: any[]): string;
//        bestLanguageMatchOrDefault(language: string, resourcesDir: string): string;
//        loadLanguage(language: string, resourcesDir: string): any;
//        getOptionalArgsArrayFromFunctionCall(functionArguments: IArguments, startFrom: number): any[];
//    }
//}


//declare module "taco-utility" {
//    module TacoUtility {
//        class Resources {
//            resources: any;
//            defaultLanguage: string;
//            constructor(language: string, resourcesDir?: string);
//            getString(id: string, ...optionalArgs: any[]): string;
//            bestLanguageMatchOrDefault(language: string, resourcesDir: string): string;
//            loadLanguage(language: string, resourcesDir: string): any;
//            getOptionalArgsArrayFromFunctionCall(functionArguments: IArguments, startFrom: number): any[];
//        }
//    }
//    export = TacoUtility;
//}


/// <reference path="../typings/node.d.ts" />
declare module TacoUtility {
    class Remote {
        resources: any;
        defaultLanguage: string;
        constructor(language: string, resourcesDir?: string);
        getString(id: string, ...optionalArgs: any[]): string;
        bestLanguageMatchOrDefault(language: string, resourcesDir: string): string;
        loadLanguage(language: string, resourcesDir: string): any;
        getOptionalArgsArrayFromFunctionCall(functionArguments: IArguments, startFrom: number): any[];
    }
    class Resources {
        resources: any;
        defaultLanguage: string;
        constructor(language: string, resourcesDir?: string);
        getString(id: string, ...optionalArgs: any[]): string;
        bestLanguageMatchOrDefault(language: string, resourcesDir: string): string;
        loadLanguage(language: string, resourcesDir: string): any;
        getOptionalArgsArrayFromFunctionCall(functionArguments: IArguments, startFrom: number): any[];
    }
}

declare module "taco-utility" {
    export = TacoUtility;
}
