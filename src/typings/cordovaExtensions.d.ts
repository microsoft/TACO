/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

// <reference path="../typings/Q.d.ts" />
// <reference path="../typings/node.d.ts" />

// Note: cordova.d.ts defines typings for cordova as a cordova app would see it.
// This file defines typings as the npm cordova module is used


declare module Cordova {
    
    export module cordova_lib {
        export class configparser {
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

    export interface ICordovaRawOptions {
        platforms: string[];
        options?: string[];
        verbose?: boolean;
        silent?: boolean;
        browserify?: boolean;
    }

    export interface ICordovaLibMetadata {
        url?: string;
        version?: string;
        id?: string;
        link?: boolean;
    }

    export interface ICordovaConfigMetadata {
        id?: string;
        name?: string;
        lib?: {
            www?: ICordovaLibMetadata;
        };
    }

    export interface ICordovaCreateParameters {
        projectPath: string;
        appId: string;
        appName: string;
        cordovaConfig: any;
        copyFrom?: string;
        linkTo?: string;
    }

    export interface ICordovaRawCliVars {
        [name: string]: string;
    }

    export interface ICordovaDownloadOptions {
        searchpath: string;
        noregistry: boolean;
        usegit: boolean;
        cli_variables: ICordovaRawCliVars;
        browserify: string;
        link: string;
        save: boolean;
        shrinkwrap: boolean;
    }

    export interface ICordovaCommandParameters {
        subCommand: string;
        targets: string[];
        downloadOptions: ICordovaDownloadOptions;
    }

    export interface ICordovaPlatformPuginInfo {
        name: string;
        spec: string;
        pluginVariables?: ICordovaVariable[];
    }

    export interface ICordovaVariable {
        name: string;
        value: string;
    }

    export interface ICordovaRaw {
        build(options: ICordovaRawOptions): Q.Promise<any>;
        config: any;
        compile(options: ICordovaRawOptions): Q.Promise<any>;
        create(dir: string, id?: string, name?: string, cfg?: any): Q.Promise<any>;
        emulate(options: ICordovaRawOptions): Q.Promise<any>;
        help: any;
        info(): Q.Promise<any[]>;
        platform(command: any, targets?: any, opts?: any): Q.Promise<any>;
        platforms(command: any, targets?: any, opts?: any): Q.Promise<any>;
        plugin(command: any, targets?: any, opts?: any): Q.Promise<any>;
        plugins(command: any, targets?: any, opts?: any): Q.Promise<any>;
        prepare(options: ICordovaRawOptions): Q.Promise<any>;
        restore(target: any, args: any): Q.Promise<any>;
        run(options: ICordovaRawOptions): Q.Promise<any>;
        save(target: any, opts?: any): Q.Promise<any>;
        serve(port: number): Q.Promise<NodeJSHttp.Server>;
    }

    export function on(event: string, ...args: any[]): void;
    export function off(event: string, ...args: any[]): void;
    export function emit(event: string, ...args: any[]): void;
    export function trigger(event: string, ...args: any[]): void;
    export function cli(args: string[]): void;
    export var raw: ICordovaRaw;
}

declare module "cordova" {
    export = Cordova
}
