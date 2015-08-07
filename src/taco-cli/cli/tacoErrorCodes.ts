/// <reference path="../../typings/node.d.ts" />
"use strict";

// Error Codes: 1000- 1999
enum TacoErrorCode {
    // General errors 1000-1499
    CordovaCmdNotFound = 1001,
    CordovaCommandFailed = 1002,
    CordovaCommandFailedWithError = 1003,
    NotInCordovaProject = 1004,
    CommandError = 1005,

    // Invalid Arguments 1500 - 1599
    CommandNotBothDeviceEmulate,
    CommandNotBothDebugRelease,
    CommandNotBothLocalRemote,
    CommandRemotePlatformNotKnown,
    CommandCreateNoPath,
    CommandCreateNotBothCliAndKit,
    CommandCreateNotBothTemplateAndCli,
    ErrorIncompatibleOptions,
    CommandCreateNotTemplateIfCustomWww,
    CommandCreateOnlyLocalCustomWww,
    CommandCreatePathNotEmpty,
    CommandRemoteDeleteNeedsPlatform,
    CommandRemoteDeletePlatformNotAdded,
    CommandRemoteInvalidPin,
    CommandRemoteInvalidPort,
    ErrorInvalidJsonFilePath,

    // Errors to do with remote 1600-1699
    CommandRemoteCantFindRemoteMount,
    CommandRemoteConnectionRefused,
    CommandRemoteNotfound,
    CommandRemoteRejectedPin,
    CommandRemoteTimedout,
    ErrorDownloadingRemoteBuild,
    ErrorHttpGet,
    ErrorUploadingRemoteBuild,
    ErrorDuringRemoteBuildSubmission,
    ErrorCertificateLoad,
    ErrorCertificatePathChmod,
    ErrorCertificateSave,
    ErrorCertificateSaveToPath,
    ErrorCertificateSaveWithErrorCode,
    UnsupportedHostPlatform,
    GetCertificateFailed,
    HttpGetFailed,
    InvalidBuildSubmission400,
    InvalidRemoteBuild,
    InvalidRemoteBuildClientCert,
    InvalidRemoteBuildUrl,
    NoCertificateFound,
    NoRemoteBuildIdFound,
    RemoteBuildError,
    RemoteBuildHostNotFound,
    RemoteBuildNoConnection,
    RemoteBuildNonSslConnectionReset,
    RemoteBuildSslConnectionReset,
    RemoteBuildStatusPollFailed,
    RemoteBuildUnsuccessful,
    RemoteBuildUnsupportedPlatform,

    CommandBuildTacoSettingsNotFound,
    CommandBuildInvalidPlatformLocation,
    CommandCreateInvalidPath,
    CommandCreateTacoJsonFileCreationError,
    CommandCreateTacoJsonFileWriteError,
    CommandCreateTemplatesUnavailable,
    CommandInstallCordovaTooOld,
    CommandKitCliOrKitShouldBeSpecified,
    CommandKitProjectUsesSameKit,
    CommandKitProjectUsesSameCli,

    ErrorInvalidPath,
    ErrorKitMetadataFileMalformed,
    ErrorNoPluginOrPlatformSpecified,
    ErrorTacoJsonMissingOrMalformed,
    ErrorPatchCreation,
    ErrorNoPlatformsFound,

    UnimplementedAbstractMethod
}

export = TacoErrorCode;
