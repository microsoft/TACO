declare module DependencyInstallerInterfaces {
    export interface IInstallerData {
        installSource: string;
        sha1: string;
        bytes: number;
        installDestination: string;
    }

    export interface IPlatformInstallerDictionary {
        [platformName: string]: IInstallerData;
    }

    export interface IDependencyData {
        displayName: string;
        licenseUrl: string;
        prerequisites: string[];
        versions: { [versionId: string]: IPlatformInstallerDictionary };
    }

    export interface IDependencyDictionary {
        [dependencyId: string]: IDependencyData;
    }
}