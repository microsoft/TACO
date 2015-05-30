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
    export enum TacoErrorCode {
        AbstractMethod,
        CouldNotConnect,
        ErrorCreatingInstallConfig,
        ErrorDeletingInstallConfig,
        FatalError,
        FileCorruptError,
        FileNotFound,
        InstallationErrors,
        LicenseAgreementError,
        NoAdminRights,
        NoPowershell,
        NoValidInstallOrder,
        UnknownExitCode,
        UnsupportedPlatform,
        UnsupportedTargetPlatform,
        TacoKitsExceptionTypescriptNotSupported,
    }
}

export = TacoDependencyInstaller;
