/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/q.d.ts" />

"use strict";

module ElevatedInstallerProtocol {
    /**
     * These exit codes are arbitrary (except for the success one). They were chosen because they seemed untaken by Powershell and Node. We need such error codes to differentiate between Powershell and Node exit
     * codes, as well as the possible outcomes of our child-process tree that has 3 levels of depth.
     *
     * Note: on Unix, return codes are limited to 1 byte, so these codes need to stay below 256.
     *
     * Powershell exit codes (just 0 and 1): http://blogs.msdn.com/b/powershell/archive/2006/10/14/windows-powershell-exit-codes.aspx (article is old, but I couldn't find evidence that it has changed)
     * Node.js exit codes (0 through 10, 12 and 128): https://github.com/nodejs/node-v0.x-archive/blob/master/doc/api/process.markdown#exit-codes
     */
    export enum ExitCode {
        Success = 0,
        CompletedWithErrors = 12,
        NoAdminRights = 33,
        CouldNotConnect = 37,
        RefusedPrompt = 42,
        FatalError = 108
    }

    export enum DataType {
        Error,
        Log,
        Prompt,
        Warning
    }

    export interface IElevatedInstallerMessage {
        dataType: DataType;
        message: string;
    }

    export interface ILogger {
        log: (message: string) => void;
        logWarning: (message: string) => void;
        logError: (message: string) => void;
        promptForEnvVariableOverwrite: (message: string) => Q.Promise<any>;
    }
}

export = ElevatedInstallerProtocol;
