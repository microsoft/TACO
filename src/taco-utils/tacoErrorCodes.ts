/// <reference path="../typings/node.d.ts" />
"use strict";

module TacoUtility {
    export enum TacoErrorCode {
        AbstractMethod,
        CommandBadArguments,
        FailedFileRead,
        FailedFileWrite,
        FailedGitClone,
        FailedRecursiveCopy,
        PackageLoaderErrorMessage,
        PackageLoaderInvalidPackageVersionSpecifier,
        PackageLoaderNpmInstallFailed,
        PackageLoaderNpmInstallFailedEaccess,
        PackageLoaderNpmInstallFailedWithCode,
        TacoUtilsExceptionListingfile,
        TacoUtilsExceptionMissingcommand
    }
}

export = TacoUtility;
