/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/Q.d.ts" />

declare module LiveReload {
    export module Patcher {
        export function Patch(projectRoot:string): Q.Promise<any>;
    }
    export interface LiveReloadHandle {
        reload: (file?: string) => Q.Promise<any>;
        stopLiveReload: () => void;
    }
    export function startLiveReload(options:any):LiveReloadHandle;
}

declare module "cordova-plugin-livereload" {
    export = LiveReload;
}