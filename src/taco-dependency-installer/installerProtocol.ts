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
    export enum ExitCode {
        Success = 1337,
        CompletedWithErrors = 2337,
        NoAdminRights = 2674,
        CouldNotConnect = 5674
    }

    export enum DataType {
        Output,
        Bold,
        Success,
        Warn,
        Error,
        Prompt
    }

    export interface IData {
        dataType: DataType;
        message: string
    }
}

export = InstallerProtocol;