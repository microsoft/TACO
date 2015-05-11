declare module DependencyInstallerInterfaces {
    export interface IInstallerData {
        installerSource: { [platformId: string]: string };
        checksum: number;
        bytes: number;
    }

    export interface IDependencyData {
        displayName: string;
        licenseUrl: string;
        prerequesites: string[];
        installers: { [versionId: string]: IInstallerData };
    }

    export interface IDependencyDictionary {
        [dependencyId: string]: IDependencyData;
    }
}