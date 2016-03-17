// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/// <reference path="../typings/node.d.ts"/>

"use strict";

/*
  This module has fakes for some node primitive objects, and utility methods 
  to configure the behavior we need from them during a test
*/

import _ = require("lodash");

/* tslint:disable:no-var-requires */
/* We don't have a .d.ts file for mock-spawn */
var mockSpawnModule = require("mock-spawn");
/* tslint:enable:no-var-requires */

export module NodeFakes {
    export interface IEnvironmentVariables {
        // We should add here the environment variables that we use in TACO. Remember to also add them in the .d.ts file
        HOME?: string;
        ANDROID_HOME?: string;
        PATH?: string;
        TACO_UNIT_TEST?: string;
    }

    export type IChildProcess = NodeJSChildProcess.ChildProcess;

    export type IExecOptions = NodeJSChildProcess.IExecOptions;

    export type Callback = (error: Error, stdout: Buffer, stderr: Buffer) => void;

    export type ExecSecondArgument = IExecOptions | Callback;

    export type CommandTester = (command: string) => boolean;

    export type ExecFileOptions = {
        cwd?: string; stdio?: any; customFds?: any; env?: any;
        encoding?: string; timeout?: number; maxBuffer?: string; killSignal?: string;
    }
    export type ForkOptions = { cwd?: string; env?: any; encoding?: string; silent?: boolean; }

    export type ProcessVersions = {
        http_parser: string; node: string; v8: string;
        ares: string; uv: string; zlib: string; openssl: string;
    };

    export type ProcessConfigTargetDefaults = {
        cflags: any[]; default_configuration: string;
        defines: string[]; include_dirs: string[]; libraries: string[];
    };

    export type ProcessConfigVariables = {
        clang: number; host_arch: string; node_install_npm: boolean; node_install_waf: boolean; node_prefix: string;
        node_shared_openssl: boolean; node_shared_v8: boolean; node_shared_zlib: boolean; node_use_dtrace: boolean;
        node_use_etw: boolean; node_use_openssl: boolean; target_arch: string; v8_no_strict_aliasing: number;
        v8_use_snapshot: boolean; visibility: string;
    };

    export type ProcessConfig = {
        target_defaults: ProcessConfigTargetDefaults;
        variables: ProcessConfigVariables;
    };

    export type SpawnOptions = { cwd?: string; stdio?: any; custom?: any; env?: any; detached?: boolean; uid?: Number; gid?: Number; }

    interface IProcessUtils {
        getProcess(): NodeJS.Process;
    }

    export class Process {
        public env: IEnvironmentVariables;

        constructor() {
            this.clearEnv();
        }

        public asProcess(): NodeJS.Process {
            return <NodeJS.Process> <any> this;
        }

        public buildProcessUtils(): IProcessUtils  {
            var fakeProcess = this.asProcess();
            return { getProcess: (): NodeJS.Process => fakeProcess };
        }

        /** Methods to configure the fake process **/
        // We simulate that 1 second passes between each call to hrtime 
        public fakeDeterministicHrtime(): Process {
            var lastHrTimeSeconds = 0;

            this.asProcess().hrtime = (time?: number[]): number[] => {
                var currentSeconds = lastHrTimeSeconds++;
                if (!time) {
                    return [currentSeconds, 0];
                } else {
                    return [currentSeconds - time[0], time[1]];
                }
            };

            return this;
        }

        // We simulate this is a Mac OS
        public fakeMacOS(): Process {
            var username = "my_username";
            this.asProcess().platform = "darwin";
            this.asProcess().env.HOME = "/Users/" + username;
            return this;
        }

        // We simulate this is a Windows
        public fakeWindows(): Process {
            var username = "my_username";
            this.asProcess().platform = "win32";
            this.asProcess().env.HOME = "C:\\Users\\" + username;
            return this;
        }

        public clearEnv(): Process {
            this.env = { TACO_UNIT_TEST: "true" };
            return this;
        }
    }

    export abstract class EventEmitter implements NodeJS.EventEmitter {
        protected abstract notImplementedError(): Error;

        // Methods from EventEmitter
        public addListener(event: string, listener: Function): NodeJS.EventEmitter {
            throw this.notImplementedError();
        }

        public on(event: string, listener: Function): NodeJS.EventEmitter {
            throw this.notImplementedError();
        }

        public once(event: string, listener: Function): NodeJS.EventEmitter {
            throw this.notImplementedError();
        }

        public removeListener(event: string, listener: Function): NodeJS.EventEmitter {
            throw this.notImplementedError();
        }

        public removeAllListeners(event?: string): NodeJS.EventEmitter {
            throw this.notImplementedError();
        }

        public setMaxListeners(n: number): void {
            throw this.notImplementedError();
        }

        public listeners(event: string): Function[] {
            throw this.notImplementedError();
        }

        public emit(event: string, ...args: any[]): boolean {
            throw this.notImplementedError();
        }
    }

    export class ChildProcess extends EventEmitter implements IChildProcess {
        public stdin: NodeJSStream.Writable;
        public stdout: NodeJSStream.Readable;
        public stderr: NodeJSStream.Readable;
        public pid: number;

        public kill(signal?: string): void {
            throw this.notImplementedError();
        }

        public send(message: any, sendHandle: any): void {
            throw this.notImplementedError();
        }

        public disconnect(): void {
            throw this.notImplementedError();
        }

        protected notImplementedError(): Error {
            return Error("This method hasn't been implemented for this test");
        }
    }

    export class ChildProcessModule /* implements typeof NodeJSChildProcess*/ {
        /** mock spawn variable. Docs at https://www.npmjs.com/package/mock-spawn **/
        public mockSpawn: any = mockSpawnModule();

        // We simulate that all calls to exect are succesfull
        public fakesAlwaysReturning(errorOrNullIfSuccesfull: Error, stdout: string = "", stderr: string = ""): ChildProcessModule {
            this.exec = (command: string, optionsOrCallback: ExecSecondArgument, callback: Callback = null): IChildProcess => {
                var realCallback = <Callback> (callback || optionsOrCallback);
                // We call the callback in an async way
                setTimeout(() => {
                    realCallback(errorOrNullIfSuccesfull, /*stdout*/ new Buffer(stdout), /*stderr*/ new Buffer(stderr));
                }, 0);
                return new ChildProcess();
            };
            return this;
        }

        // We simulate that all calls to exect are succesfull
        public fakeAllExecCallsSucceed(): ChildProcessModule {
            return this.fakesAlwaysReturning(null);
        }

        // We simulate that all calls to exect end with an error
        public fakeAllExecCallsEndingWithErrors(): ChildProcessModule {
            return this.fakeAllExecCallsEndingWithError(undefined); // undefined forces it to use the default error
        }

        // This method will make all child_process.exec call fail with the specified error
        public fakeAllExecCallsEndingWithError(error: Error): ChildProcessModule {
            this.exec = (command: string, optionsOrCallback: ExecSecondArgument, callback: Callback = null): IChildProcess => {
                return this.callCallback(command, optionsOrCallback, callback, false, error);
            };
            return this;
        }

        public fakeUsingCommandToDetermineResult(successFilter: CommandTester, failureFilter: CommandTester): ChildProcessModule {
            this.exec = (command: string, optionsOrCallback: ExecSecondArgument, callback?: Callback): IChildProcess => {
                var isSuccess: boolean = successFilter(command);
                var isFailure: boolean = failureFilter(command);

                if (isSuccess !== isFailure) {
                    return this.callCallback(command, optionsOrCallback, callback, isSuccess);
                } else {
                    throw new Error("A command should be exactly a success, or a failure. It can't be both nor either.\n"
                        + "Command: " + command + " isSuccess: " + isSuccess + " isFailure: " + isFailure);
                }
            };
            return this;
        }

        public spawn(command: string, args?: string[], options?: SpawnOptions): IChildProcess {
            return this.mockSpawn(command, args, options);
        }

        public exec(command: string, options: IExecOptions, callback: Callback): IChildProcess;
        public exec(command: string, callback: Callback): IChildProcess;
        public exec(command: string, optionsOrCallback: IExecOptions | Callback, callback?: Callback): IChildProcess {
            throw this.notImplementedError();
        }

        public execFile(file: string, callback?: Callback): IChildProcess;
        public execFile(file: string, args?: string[], callback?: Callback): IChildProcess;
        public execFile(file: string, args?: string[], options?: ExecFileOptions, callback?: Callback): IChildProcess;
        public execFile(file: string, argsOrCallback?: string[] | Callback, optionsOrCallback?: ExecFileOptions, callback?: Callback): IChildProcess {
            throw this.notImplementedError();
        }

        public fork(modulePath: string, args?: string[], options?: ForkOptions): IChildProcess {
            throw this.notImplementedError();
        }

        private callCallback(command: string, optionsOrCallback: ExecSecondArgument,
            callback: Callback, wasSuccessful: boolean, error: Error = new Error("Error while executing " + command)): ChildProcess {
            var realCallback = <Callback> (callback || optionsOrCallback);
            // We call the callback in an async way
            setTimeout(() => {
                realCallback(wasSuccessful ? null : error, /*stdout*/ new Buffer(""), /*stderr*/ new Buffer(""));
            }, 0);
            return new ChildProcess();
        }

        private notImplementedError(): Error {
            return Error("This method hasn't been implemented for this test");
        }
    }
}
