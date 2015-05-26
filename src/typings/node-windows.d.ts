/**
? *******************************************************
? *                                                     *
? *   Copyright (C) Microsoft. All rights reserved.     *
? *                                                     *
? *******************************************************
? */

/// <reference path="../typings/node.d.ts" />

declare module NodeWindows {
    // Add more complete typings as needed
    export function elevate(cmd: string, callback: (error: Error, stdout?: Buffer, stderr?: Buffer) => any): void;
    export function elevate(cmd: string, options: NodeJSChildProcess.IExecOptions, callback: (error: Error, stdout?: Buffer, stderr?: Buffer) => any): void;
    export function isAdminUser(callback: (isAdmin: boolean) => any): void;
}

declare module "node-windows" {
    export = NodeWindows;
}