/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */


declare module CordovaLib {
    export interface ICordovaLib {
    }

    export class CordovaConfigParser {
        constructor(configXmlPath: string);
        getPlugin(id: string): any;
        removePlugin(id: string): void;
        addPlugin(attributes: Cordova.ICordovaPlatformPuginInfo, varaibles: Cordova.ICordovaVariable[]): any;
        getEngines(): Cordova.ICordovaPlatformPuginInfo[];
        removeEngine(name: string): void;
        addEngine(name: string, spec: string): any;
        write(): any;
    }
}

declare module "cordova_lib" {
    export = CordovaLib
}
