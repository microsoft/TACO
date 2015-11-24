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
    
    // Listen to livereload specific events:
    //     - "livereload:error"
    //     - "livereload:start"
    export function on(eventName: string, cb: (...args : any[]) => void): void;
    
    // Checks to see if Livereload is already running
    export function isLiveReloadActive(): boolean;

    // Responsible for removing any restrictions that prevents 
    // ... the client from contacting the BrowserSync server
    export class Patcher {
        
        constructor(projectRoot: string, platforms: string[]);
        
        // Removes Content-Security-Policy limitations
        public removeCSP(): void;
        
        // Removes CSP, ATS, Changes the start page of the app from local 'index.html' to the one remotely hosted by the BrowserSync server
        public patch(serverURL: string): Q.Promise<any>;
    }

    // Provides us with an interface to the BrowserSync server. Through this, we can:
    //   - Stop the BrowserSync server
    //   - Reload all connected browsers
    //   - Reload a changed file (if possible, otherwise it reloads all connected browsers)
    export interface LiveReloadHandle {
        reloadFile(file?: string): Q.Promise<any>;
        stop(): void;
        reloadBrowsers(): Q.Promise<any>;
    }

    // Options we might want to start the BrowserSync server with:
    //   - ignore: specifies what folders/files whose changes to ignore when livereloading
    //   - ghostMode: specifies whether we want to sync gestures(clicks, form inputs, scrolls) across connected devices
    //   - cb: function that gets called whenever a change in the watched folders/files occurs
    export interface LiveReloadOptions {
        ignore: string,
        ghostMode: boolean,
        cb(event: string, file: string, lrHandle: LiveReloadHandle): Q.Promise<any>;
    }
}

declare module "taco-livereload" {
    export = TacoLiveReload;
}