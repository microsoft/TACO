declare module DependencyInstallerInterfaces {
    export interface IInstallerInfo {
        installFrom: { [platformId: string]: string };
        checksum: number;
        bytes: number;
    }

    export interface IDependencyInfo {
        displayName: string;
        licenseUrl: string;
        prerequesites: string[];
        installers: { [versionId: string]: IInstallerInfo };
    }

    export interface IDependencyDictionary {
        [dependencyId: string]: IDependencyInfo;
    }
}