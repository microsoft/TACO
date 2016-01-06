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
            getPlugin(id: string): Cordova.ICordovaPluginInfo;
            getPlugins(): Cordova.ICordovaPluginInfo[];
            removePlugin(id: string): void;
            addPlugin(attributes: Cordova.ICordovaPluginInfo , variables: IDictionary<string>): void;
            getEngines(): Cordova.ICordovaPlatformInfo [];
            removeEngine(name: string): void;
            addEngine(name: string, spec: string): void;
            write(): void;
        }

        export var cordova_platforms: { [platform: string]: any };
    }

    export interface IKeyValueStore<T> {
        [key: string]: T
    }

    export interface ICordovaRawOptions {
        platforms: string[];
        options?: string[];
        verbose?: boolean;
        silent?: boolean;
        browserify?: boolean;
    }

    export interface ICordova540BuildOptions {
        debug?: boolean;
        release?: boolean;
        device?: boolean;
        emulator?: boolean;
        target?: string;
        nobuild?: boolean;
        archs?: string[];
        buildconfig?: string;
        argv?: string[];
    }

    export interface ICordova540RawOptions {
        platforms: string[];
        options?: ICordova540BuildOptions;
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

    export interface ICordovaPluginOptions {
        searchpath?: string;
        noregistry?: boolean;
        cli_variables?: IDictionary<string>;
        browserify?: string;
        link?: string;
        save?: boolean;
        shrinkwrap?: boolean;
    }

    export interface ICordovaPlatformOptions {
        usegit?: boolean;
        link?: string;
        save?: boolean;
    }

    export interface ICordovaPluginInfo  {
        name: string;
        spec: string;
        pluginVariables?: IDictionary<string>;
    }

    export interface ICordovaPlatformInfo  {
        name: string;
        spec: string;
    }

    export interface ICordovaRawT<OptionType> {
        build(options: OptionType): Q.Promise<any>;
        config: any;
        compile(options: OptionType): Q.Promise<any>;
        create(dir: string, id?: string, name?: string, cfg?: any): Q.Promise<any>;
        emulate(options: OptionType): Q.Promise<any>;
        help: any;
        info(): Q.Promise<any[]>;
        platform(command: any, targets?: any, opts?: any): Q.Promise<any>;
        platforms(command: any, targets?: any, opts?: ICordovaPlatformOptions): Q.Promise<any>;
        plugin(command: any, targets?: any, opts?: ICordovaPluginOptions): Q.Promise<any>;
        plugins(command: any, targets?: any, opts?: any): Q.Promise<any>;
        prepare(options?: OptionType): Q.Promise<any>;
        restore(target: any, args: any): Q.Promise<any>;
        run(options: OptionType): Q.Promise<any>;
        save(target: any, opts?: any): Q.Promise<any>;
        serve(port: number): Q.Promise<NodeJSHttp.Server>;
        targets(options: OptionType): Q.Promise<any>;
    }

    export interface ICordovaRaw510T<T> extends ICordovaRawT<T> {
        requirements(platforms: string[]): Q.Promise<any>;
    }


    export interface ICordovaT<T> {
        on(event: string, ...args: any[]): void;
        off(event: string, ...args: any[]): void;
        emit(event: string, ...args: any[]): void;
        trigger(event: string, ...args: any[]): void;
        cli(args: string[]): void;
        raw: ICordovaRawT<T>;
    }

    export interface ICordova510T<T> extends ICordovaT<T> {
        raw: ICordovaRaw510T<T>;
    }

    export type ICordova = ICordovaT<ICordovaRawOptions>; // Pre-5.1.0 cordova
    export type ICordova510 = ICordova510T<ICordovaRawOptions>; // >= 5.1.0 < 5.4.0 cordova
    export type ICordova540 = ICordova510T<ICordova540RawOptions>; // Post-5.4.0 cordova

    export interface IFetchJson {
        [key: string]: {
            variables?: IKeyValueStore<string>
        }
    }



    export function on(event: string, ...args: any[]): void;
    export function off(event: string, ...args: any[]): void;
    export function emit(event: string, ...args: any[]): void;
    export function trigger(event: string, ...args: any[]): void;
    export function cli(args: string[]): void;
    export var raw: ICordovaRawT<ICordovaRawOptions | ICordova540RawOptions>;
}

declare module "cordova" {
    export = Cordova
}
