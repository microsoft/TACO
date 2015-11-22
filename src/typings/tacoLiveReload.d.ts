/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/Q.d.ts" />

declare module TacoLiveReload {

    export function start(projectRoot: string, platforms: string[], options: LiveReloadOptions): Q.Promise<any>;
    export function on(eventName: string, cb: (...args : any[]) => void): void;
    export function isLiveReloadActive(): boolean;

    export class Patcher {
        constructor(projectRoot: string, platforms: string[]);
        public removeCSP(): void;
        public patch(serverURL: string): Q.Promise<any>;
    }

    export interface LiveReloadHandle {
        reloadFile(file?: string): Q.Promise<any>;
        stop(): void;
        reloadBrowsers(): Q.Promise<any>;
    }

    export interface LiveReloadOptions {
        ignore: string,
        ghostMode: boolean,
        cb(event: string, file: string, lrHandle: LiveReloadHandle): Q.Promise<any>;
    }
}

declare module "taco-livereload" {
    export = TacoLiveReload;
}