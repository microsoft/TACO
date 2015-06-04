/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />

"use strict";

module InstallerProtocol {
    /**
     * These exit codes are arbitrary (except for the success one). They were chosen because they seemed untaken by Powershell and Node. We need such error codes to differentiate between Powershell and Node exit
     * codes, as well as the possible outcomes of our child-process tree that has 3 levels of depth.
     */
    export enum ExitCode {
        Success = 0,
        CompletedWithErrors = 2337,
        NoAdminRights = 2674,
        CouldNotConnect = 5674,
        FatalError = 8674
    }

    export enum DataType {
        Log,
        Prompt
    }

    export interface IData {
        dataType: DataType;
        message: string
    }
}

export = InstallerProtocol;