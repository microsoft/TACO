/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/

// Note: cordova.d.ts defines typings for cordova as a cordova app would see it.
// This file defines typings as the npm cordova module is used

declare module "cordova" {
    import Q = require('q');
    import http = require('http');

    module Cordova {
        export interface ICordovaRaw {
            prepare(options?: any): Q.Promise<any>;
            build(options?: any): Q.Promise<any>;
            help: any;
            config: any;
            create(dir: string, id?: string, name?: string, cfg?: any): Q.Promise<any>;
            emulate(options?: any): Q.Promise<any>;
            plugin(command: any, targets?: any, opts?: any): Q.Promise<any>;
            plugins(command: any, targets?: any, opts?: any): Q.Promise<any>;
            serve(port: number): Q.Promise<http.Server>;
            platform(command: any, targets?: any, opts?: any): Q.Promise<any>;
            platforms(command: any, targets?: any, opts?: any): Q.Promise<any>;
            compile(options: any): Q.Promise<any>;
            run(options?: any): Q.Promise<any>;
            info(): Q.Promise<any[]>;
            save(target: any, opts?: any): Q.Promise<any>;
            restore(target: any, args: any): Q.Promise<any>;
        }

        export function on(event: string, ...args: any[]) : void;
        export function off(event: string, ...args: any[]) : void;
        export function emit(event: string, ...args: any[]) : void;
        export function trigger(event: string, ...args: any[]): void;
        export function cli(args: string[]): void;
        export var raw: ICordovaRaw;
    }

    export = Cordova
}