/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/elementtree.d.ts" />
/// <reference path="../typings/unorm.d.ts" />
declare module TacoUtility {
    class CordovaConfig {
        /** CordovaConfig is a class for parsing the config.xml file for Cordova projects */
        private _doc;
        constructor(configXmlPath: string);
        id(): string;
        name(): string;
        version(): string;
        preferences(): {
            [key: string]: string;
        };
    }
}