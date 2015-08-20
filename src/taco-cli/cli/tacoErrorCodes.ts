/// <reference path="../../typings/node.d.ts" />
"use strict";

// Error Codes: 5000- 5999
enum TacoErrorCode {
    // General errors 5000-5449
    CordovaCmdNotFound = 5001,
    CordovaCommandFailed = 5002,
    CordovaCommandFailedWithError = 5003,
    NotInCordovaProject = 5004,
    CommandError = 5005,
    UnimplementedAbstractMethod = 5006,
    ErrorTacoJsonMissingOrMalformed = 5007,
    ErrorNoPlatformsFound = 5008,
    CommandBuildTacoSettingsNotFound = 5009,
    TacoSettingsFileDoesNotExist = 5010,
    CommandBuildInvalidPlatformLocation = 5011,
    ErrorOperationCancelled = 5012,
    ErrorInvalidVersion = 5013,
    ErrorReadingPackageVersions = 5014,

    // Errors to do with Create 5450-5499
    CommandCreateGitCloneError = 5451,
    CommandCreateInvalidPath = 5452,
    CommandCreateNoGit = 5453,
    CommandCreateTacoJsonFileCreationError = 5454,
    CommandCreateTacoJsonFileWriteError = 5455,
    CommandCreateTemplatesUnavailable = 5456,
    
    // Invalid Arguments 5500 - 5599
    // General invalid arguments 5500 - 5509
    ErrorIncompatibleOptions = 5501,
     
    // Invalid arguments for remote 5510 - 5529
    CommandRemotePlatformNotKnown = 5511,
    CommandRemoteDeleteNeedsPlatform = 5512,
    CommandRemoteDeletePlatformNotAdded = 5513,
    CommandRemoteInvalidPin = 5514,
    CommandRemoteInvalidPort = 5515,

    // Invalid arguments for create 5530 - 5549
    CommandCreateNoPath = 5531,
    CommandCreateNotBothCliAndKit = 5532,
    CommandCreateNotBothTemplateAndCli = 5533,
    CommandCreateNotTemplateIfCustomWww = 5534,
    CommandCreateOnlyLocalCustomWww = 5535,
    CommandCreatePathNotEmpty = 5536,

    // Invalid arguments for kits 5550 - 5569
    CommandKitCliOrKitShouldBeSpecified = 5551,
    CommandKitProjectUsesSameKit = 5552,
    CommandKitProjectUsesSameCli = 5553,
    ErrorInvalidJsonFilePath = 5554,
    ErrorInvalidPath = 5555,
    ErrorNoPluginOrPlatformSpecified = 5556,

    // Errors to do with remote 5600-5699
    CommandRemoteCantFindRemoteMount = 5600,
    CommandRemoteConnectionRefused = 5601,
    CommandRemoteNotfound = 5602,
    CommandRemoteRejectedPin = 5603,
    CommandRemoteTimedout = 5604,
    ErrorDownloadingRemoteBuild = 5605,
    ErrorHttpGet = 5606,
    ErrorUploadingRemoteBuild = 5607,
    ErrorDuringRemoteBuildSubmission = 5608,
    ErrorCertificateLoad = 5609,
    ErrorCertificatePathChmod = 5610,
    ErrorCertificateSave = 5611,
    ErrorCertificateSaveToPath = 5612,
    ErrorCertificateSaveWithErrorCode = 5613,
    UnsupportedHostPlatform = 5614,
    GetCertificateFailed = 5615,
    HttpGetFailed = 5616,
    InvalidBuildSubmission400 = 5617,
    InvalidRemoteBuild = 5618,
    InvalidRemoteBuildClientCert = 5619,
    InvalidRemoteBuildUrl = 5620,
    NoCertificateFound = 5621,
    NoRemoteBuildIdFound = 5622,
    RemoteBuildError = 5623,
    RemoteBuildHostNotFound = 5624,
    RemoteBuildNoConnection = 5625,
    RemoteBuildNonSslConnectionReset = 5626,
    RemoteBuildSslConnectionReset = 5627,
    RemoteBuildStatusPollFailed = 5628,
    RemoteBuildUnsuccessful = 5629,
    RemoteBuildUnsupportedPlatform = 5630,
    ErrorPatchCreation = 5631,

    // Errors related to install-reqs 5700-5749
    CommandInstallCordovaTooOld = 5700,
    CommandInstallNoPlatformsAdded = 5701,
    CommandInstallNoPlatformsFolder = 5702
}

export = TacoErrorCode;
