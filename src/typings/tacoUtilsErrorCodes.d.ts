declare module TacoUtility {
    enum TacoErrorCode {
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
