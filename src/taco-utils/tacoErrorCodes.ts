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

        // Misc Errors: 700+
        AbstractMethod = 701,
        CommandBadSubcommand = 702,
        TacoUtilsExceptionListingfile = 703,
        TacoUtilsExceptionMissingcommand = 704,
    }
}

export = TacoUtility;
