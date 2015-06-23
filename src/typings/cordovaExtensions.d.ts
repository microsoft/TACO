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

    export interface ICordovaPluginOptions {
        cli_variables?: IKeyValueStore<string>
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
        plugin(command: any, targets?: any, opts?: ICordovaPluginOptions): Q.Promise<any>;
        plugins(command: any, targets?: any, opts?: any): Q.Promise<any>;
        prepare(options: ICordovaRawOptions): Q.Promise<any>;
        restore(target: any, args: any): Q.Promise<any>;
        run(options: ICordovaRawOptions): Q.Promise<any>;
        save(target: any, opts?: any): Q.Promise<any>;
        serve(port: number): Q.Promise<NodeJSHttp.Server>;
    }

    export interface ICordovaRaw510 extends ICordovaRaw {
        requirements(platforms: string[]): Q.Promise<any>;
    }

    export interface ICordova {
        on(event: string, ...args: any[]): void;
        off(event: string, ...args: any[]): void;
        emit(event: string, ...args: any[]): void;
        trigger(event: string, ...args: any[]): void;
        cli(args: string[]): void;
        raw: ICordovaRaw;
    }

    export interface IFetchJson {
        [key: string]: {
            variables?: IKeyValueStore<string>
        }
    }

    export interface ICordova510 extends ICordova {
        raw: ICordovaRaw510;
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
