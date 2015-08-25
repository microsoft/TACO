/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../../typings/cordovaExtensions.d.ts" />

import Q = require ("q");

module MockCordova {
    interface IHasStack {
        stack: any;
    }

    class MethodNotImplementedException implements Error {
        public name: string = "The Cordova method hasn't been customized during this test";
        public message: string;
        public methodName: string;

        constructor(caller: any, methodName: string, message: string) {
            this.message = message;
            this.methodName = methodName;
        }

        public toString(): string {
            return this.message;
        }
    }

    function notImplemented<T>(): T {
        var caller = arguments.callee.caller;

        // Next line hacks, gets the name of the method that was called from the stack trace (e.g.: MockCordovaRaw510.build)
        var methodName = (<IHasStack><Object>new Error()).stack.split("\n")[2].replace(/^ +at ([A-z0-9]+\.[A-z0-9]+) \(.*/, "$1");

        throw new MethodNotImplementedException(caller, methodName, "The cordova method " + methodName +
            " was called during a test. You need to provide a custom implementation");
        return <T>null;
    }

    export class MockCordova510 implements Cordova.ICordova510 {
        public raw = new MockCordovaRaw510();

        public on(event: string, ...args: any[]): void {
            notImplemented();
        }

        public off(event: string, ...args: any[]): void {
            notImplemented();
        }

        public emit(event: string, ...args: any[]): void {
            notImplemented();
        }

        public trigger(event: string, ...args: any[]): void {
            notImplemented();
        }

        public cli(args: string[]): void {
            notImplemented();
        }
    }

    export class MockCordovaRaw510 implements Cordova.ICordovaRaw510 {
        public config: any = {};
        public help: any = {};

        public build(options: Cordova.ICordovaRawOptions): Q.Promise<any> {
            return notImplemented<Q.Promise<any>>();
        }

        public compile(options: Cordova.ICordovaRawOptions): Q.Promise<any> {
            return notImplemented<Q.Promise<any>>();
        }

        public create(dir: string, id?: string, name?: string, cfg?: any): Q.Promise<any> {
            return notImplemented<Q.Promise<any>>();
        }

        public emulate(options: Cordova.ICordovaRawOptions): Q.Promise<any> {
            return notImplemented<Q.Promise<any>>();
        }

        public info(): Q.Promise<any[]> {
            return notImplemented<Q.Promise<any>>();
        }

        public platform(command: any, targets?: any, opts?: any): Q.Promise<any> {
            return notImplemented<Q.Promise<any>>();
        }

        public platforms(command: any, targets?: any, opts?: any): Q.Promise<any> {
            return notImplemented<Q.Promise<any>>();
        }

        public plugin(command: any, targets?: any, opts?: Cordova.ICordovaPluginOptions): Q.Promise<any> {
            return notImplemented<Q.Promise<any>>();
        }

        public plugins(command: any, targets?: any, opts?: any): Q.Promise<any> {
            return notImplemented<Q.Promise<any>>();
        }

        public prepare(options: Cordova.ICordovaRawOptions): Q.Promise<any> {
            return notImplemented<Q.Promise<any>>();
        }

        public restore(target: any, args: any): Q.Promise<any> {
            return notImplemented<Q.Promise<any>>();
        }

        public run(options: Cordova.ICordovaRawOptions): Q.Promise<any> {
            return notImplemented<Q.Promise<any>>();
        }

        public save(target: any, opts?: any): Q.Promise<any> {
            return notImplemented<Q.Promise<any>>();
        }

        public serve(port: number): Q.Promise<NodeJSHttp.Server> {
            return notImplemented<Q.Promise<any>>();
        }

        public requirements(platforms: string[]): Q.Promise<any> {
            return notImplemented<Q.Promise<any>>();
        }
    }
}

export = MockCordova;
