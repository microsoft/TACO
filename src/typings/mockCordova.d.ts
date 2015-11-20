/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/Q.d.ts" />

declare module TacoTestsUtils {
    module MockCordova {
        interface IHasStack {
            stack: any;
        }

        class MethodNotImplementedException implements Error {
            public name: string;
            public message: string;
            public methodName: string;

            constructor(caller: any, methodName: string, message: string);
            public toString(): string;
        }

        function notImplemented<T>(): T;

        export class MockCordova510 implements Cordova.ICordova510 {

            public raw: MockCordovaRaw510;

            public static getDefault(): MockCordova510;

            public on(event: string, ...args: any[]): void;

            public off(event: string, ...args: any[]): void;

            public emit(event: string, ...args: any[]): void;

            public trigger(event: string, ...args: any[]): void;

            public cli(args: string[]): void;
        }

        export class MockCordovaRaw510 implements Cordova.ICordovaRaw510T<Cordova.ICordovaRawOptions> {
            public config: any;
            public help: any;

            public build(options: Cordova.ICordovaRawOptions): Q.Promise<any>;

            public compile(options: Cordova.ICordovaRawOptions): Q.Promise<any>;

            public create(dir: string, id?: string, name?: string, cfg?: any): Q.Promise<any>;

            public emulate(options: Cordova.ICordovaRawOptions): Q.Promise<any>;

            public info(): Q.Promise<any[]>;

            public platform(command: any, targets?: any, opts?: any): Q.Promise<any>;

            public platforms(command: any, targets?: any, opts?: any): Q.Promise<any>;

            public plugin(command: any, targets?: any, opts?: Cordova.ICordovaPluginOptions): Q.Promise<any>;

            public plugins(command: any, targets?: any, opts?: any): Q.Promise<any>;

            public prepare(options: Cordova.ICordovaRawOptions): Q.Promise<any>;

            public restore(target: any, args: any): Q.Promise<any>;

            public run(options: Cordova.ICordovaRawOptions): Q.Promise<any>;

            public save(target: any, opts?: any): Q.Promise<any>;

            public serve(port: number): Q.Promise<NodeJSHttp.Server>;

            public targets(options: Cordova.ICordovaRawOptions): Q.Promise<any>;

            public requirements(platforms: string[]): Q.Promise<any>;
        }
    }
}
