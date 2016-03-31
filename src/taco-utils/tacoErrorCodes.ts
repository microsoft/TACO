// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/// <reference path="../typings/node.d.ts" />
"use strict";

module TacoUtility {
    // Error Codes: 0100- 0999
    export enum TacoErrorCode {
        // File IO Errors: 100-200
        FailedFileRead = 101,
        FailedFileWrite = 102,
        FailedRecursiveCopy = 103,

        // Package Loader Errors: 200-250
        PackageLoaderInvalidPackageVersionSpecifier = 201,
        PackageLoaderNpmInstallErrorMessage = 202,
        PackageLoaderNpmInstallFailedEaccess = 203,
        PackageLoaderNpmInstallFailedWithCode = 204,
        PackageLoaderNpmUpdateErrorMessage = 205,
        PackageLoaderNpmUpdateFailedEaccess = 206,
        PackageLoaderNpmUpdateFailedWithCode = 207,
        PackageLoaderUpdateUnableToRecover = 208,
        PackageLoaderRunPackageDoesntHaveRequestedBinary = 209,

        // Cordova related Errors: 300-400
        InvalidCordovaWithNode5 = 301,
        CordovaCommandUnhandledException = 302,
        CordovaCmdNotFound = 303,
        CordovaCommandFailedWithError = 304,
        CommandInstallCordovaTooOld = 305,
        CordovaCommandFailed = 306,

        // Misc Errors: 700+
        AbstractMethod = 701,
        CommandBadSubcommand = 702,
        TacoUtilsExceptionListingfile = 703,
        TacoUtilsExceptionMissingcommand = 704,
        ErrorUserJsonMissing = 705,
        ErrorUserJsonMalformed = 706,
        CommandCreateTacoJsonFileCreationError = 707,
        CommandCreateTacoJsonFileWriteError = 708,
        CommandCreateOnlyLocalCustomWww = 709
    }
}

export = TacoUtility;
