declare module TacoUtility {
    enum TacoErrorCode {
        AbstractMethod,
        CommandBadSubcommand,
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
