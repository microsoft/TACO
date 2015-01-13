/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/

// Note: cordova.d.ts defines typings for cordova as a cordova app would see it.
// This file defines typings as the npm cordova module is used

declare module "taco-lib" {

    import Q = require('q');

    export function create(dir: string, id: string, name: string, cfg: string): Q.Promise<any>;
    export function build(options?: any): Q.Promise<any>;
    export function compile(options?: any): Q.Promise<any>;
    export function prepare(options?: any): Q.Promise<any>;
    export function platform(command: string, targets?: string, options?: any): Q.IPromise<any>;
    export function run(options?: any): Q.Promise<any>;
    export function emulate(options?: any): Q.Promise<any>;
}