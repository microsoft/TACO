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
        FileCorruptError,
        FileNotFound,
        InstallationErrors,
        LicenseAgreementError,
        NoAdminRights,
        NoValidInstallOrder,
        UnknownExitCode,
        UnsupportedPlatform,
        UnsupportedTargetPlatform,
        TacoKitsExceptionTypescriptNotSupported,
    }
}

export = TacoDependencyInstaller;
