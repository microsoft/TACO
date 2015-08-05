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
     */
    export enum ExitCode {
        Success = 0,
        CompletedWithErrors = 12,
        NoAdminRights = 33,
        CouldNotConnect = 37,
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
        message: string
    }

    export interface ILogger {
        log: (message: string) => void;
        logWarning: (message: string) => void;
        logError: (message: string) => void;
        promptForEnvVariableOverwrite: (message: string) => Q.Promise<any>;
    }
}

export = ElevatedInstallerProtocol;