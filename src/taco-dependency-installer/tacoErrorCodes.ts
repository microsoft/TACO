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
        FileCorruptError,
        FileNotFound,
        InstallationErrors,
        LicenseAgreementError,
        NoValidInstallOrder,
        UnsupportedPlatform,
        UnsupportedTargetPlatform,
        TacoKitsExceptionTypescriptNotSupported,
        ErrorDeletingInstallConfig,
        ErrorCreatingInstallConfig
    }
}

export = TacoDependencyInstaller;
