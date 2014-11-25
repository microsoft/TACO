/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/

/// <reference path="cordova.d.ts"/>
/// <reference path="../Q/Q.d.ts"/>
/// <reference path="../node/node.d.ts"/>

declare module "cordova" {
    import Q = require("q");
    import http = require("http");

    export interface CordovaRaw {
        prepare(options?: any): Q.IPromise<any>;
        build(options?: any): Q.IPromise<any>;
        help: any;
        config: any;
        create(dir: string, id?: string, name?: string, cfg?: any): Q.IPromise<any>;
        emulate(options?: any): Q.IPromise<any>;
        plugin(command: any, targets: any, opts: any): Q.IPromise<any>;
        plugins(command: any, targets: any, opts: any): Q.IPromise<any>;
        serve(port: number): Q.IPromise<http.Server>;
        platform(command: any, targets: any, opts: any): Q.IPromise<any>;
        platforms(command: any, targets: any, opts: any): Q.IPromise<any>;
        compile(options: any): Q.IPromise<any>;
        run(options?: any): Q.IPromise<any>;
        info(): Q.IPromise<any[]>;
        save(target: any, opts: any): Q.IPromise<any>;
        restore(target: any, args: any): Q.IPromise<any>;
    }

    export interface Cordova2 extends Cordova {
        raw: CordovaRaw;
    }

    export var cordova: Cordova2;
}