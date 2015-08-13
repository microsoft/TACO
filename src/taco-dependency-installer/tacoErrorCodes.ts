/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />

"use strict";

module TacoDependencyInstaller {
    // Error Codes: 2100-2199
    export enum TacoErrorCode {
        AbstractMethod = 2101,
        CouldNotConnect = 2102,
        ErrorCreatingInstallConfig = 2103,
        ErrorDeletingInstallConfig = 2104,
        FatalError = 2105,
        FileCorruptError = 2106,
        FileNotFound = 2107,
        InstallationErrors = 2108,
        LicenseAgreementError = 2109,
        NoAdminRights = 2110,
        NoPowershell = 2111,
        NoValidInstallOrder = 2112,
        UnknownExitCode = 2113,
        UnsupportedPlatform = 2114,
        TacoKitsExceptionTypescriptNotSupported = 2115,
    }
}

export = TacoDependencyInstaller;
