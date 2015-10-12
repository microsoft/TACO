/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />

declare module TacoTestsUtils {
    export module NodeFakes {
        interface IEnvironmentVariables {
            HOME?: string;
        }
        type IChildProcess = NodeJSChildProcess.ChildProcess;
        type IExecOptions = NodeJSChildProcess.IExecOptions;
        type Callback = (error: Error, stdout: Buffer, stderr: Buffer) => void;
        type ExecSecondArgument = IExecOptions | Callback;
        type ExecFileOptions = {
            cwd?: string;
            stdio?: any;
            customFds?: any;
            env?: any;
            encoding?: string;
            timeout?: number;
            maxBuffer?: string;
            killSignal?: string;
        };
        type ForkOptions = {
            cwd?: string;
            env?: any;
            encoding?: string;
            silent?: boolean;
        };
        type ProcessVersions = {
            http_parser: string;
            node: string;
            v8: string;
            ares: string;
            uv: string;
            zlib: string;
            openssl: string;
        };
        type ProcessConfigTargetDefaults = {
            cflags: any[];
            default_configuration: string;
            defines: string[];
            include_dirs: string[];
            libraries: string[];
        };
        type ProcessConfigVariables = {
            clang: number;
            host_arch: string;
            node_install_npm: boolean;
            node_install_waf: boolean;
            node_prefix: string;
            node_shared_openssl: boolean;
            node_shared_v8: boolean;
            node_shared_zlib: boolean;
            node_use_dtrace: boolean;
            node_use_etw: boolean;
            node_use_openssl: boolean;
            target_arch: string;
            v8_no_strict_aliasing: number;
            v8_use_snapshot: boolean;
            visibility: string;
        };
        type ProcessConfig = {
            target_defaults: ProcessConfigTargetDefaults;
            variables: ProcessConfigVariables;
        };
        type SpawnOptions = {
            cwd?: string;
            stdio?: any;
            custom?: any;
            env?: any;
            detached?: boolean;
            uid?: Number;
            gid?: Number;
        };
        class Process {
            env: IEnvironmentVariables;
            constructor();
            asProcess(): NodeJS.Process;
            /** Methods to configure the fake process **/
            fakeDeterministicHrtime(): Process;
            fakeMacOS(): Process;
            fakeWindows(): Process;
        }
        abstract class EventEmitter implements NodeJS.EventEmitter {
            protected abstract notImplementedError(): Error;
            addListener(event: string, listener: Function): NodeJS.EventEmitter;
            on(event: string, listener: Function): NodeJS.EventEmitter;
            once(event: string, listener: Function): NodeJS.EventEmitter;
            removeListener(event: string, listener: Function): NodeJS.EventEmitter;
            removeAllListeners(event?: string): NodeJS.EventEmitter;
            setMaxListeners(n: number): void;
            listeners(event: string): Function[];
            emit(event: string, ...args: any[]): boolean;
        }
        class ChildProcess extends EventEmitter implements IChildProcess {
            stdin: NodeJSStream.Writable;
            stdout: NodeJSStream.Readable;
            stderr: NodeJSStream.Readable;
            pid: number;
            kill(signal?: string): void;
            send(message: any, sendHandle: any): void;
            disconnect(): void;
            protected notImplementedError(): Error;
        }
        class ChildProcessModule {
            /** Methods to configure the fake process **/
            fakeAllExecCallsEndingWithErrors(): ChildProcessModule;
            spawn(command: string, args?: string[], options?: SpawnOptions): IChildProcess;
            exec(command: string, options: IExecOptions, callback: Callback): IChildProcess;
            exec(command: string, callback: Callback): IChildProcess;
            execFile(file: string, callback?: Callback): IChildProcess;
            execFile(file: string, args?: string[], callback?: Callback): IChildProcess;
            execFile(file: string, args?: string[], options?: ExecFileOptions, callback?: Callback): IChildProcess;
            fork(modulePath: string, args?: string[], options?: ForkOptions): IChildProcess;
            private notImplementedError();
        }
    }
}
