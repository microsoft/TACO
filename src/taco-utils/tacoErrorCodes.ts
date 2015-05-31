/// <reference path="../typings/node.d.ts" />
"use strict";

module TacoUtility {
    export enum TacoErrorCode {
        AbstractMethod,
        CommandBadArguments,
        FailedFileRead,
        FailedFileWrite,
        FailedRecursiveCopy,
        PackageLoaderInvalidPackageVersionSpecifier,
        PackageLoaderNpmInstallErrorMessage,
        PackageLoaderNpmInstallFailedEaccess,
        PackageLoaderNpmInstallFailedWithCode,
        PackageLoaderNpmUpdateErrorMessage,
        PackageLoaderNpmUpdateFailedEaccess,
        PackageLoaderNpmUpdateFailedWithCode,
        TacoUtilsExceptionListingfile,
        TacoUtilsExceptionMissingcommand,
    }
}

export = TacoUtility;
