/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/taco-utils.d.ts" />

declare module DependenciesInstaller {
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

    export class DependenciesInstaller {
        public constructor();

        /**
         * Runs the dependenciesInstaller package to install missing 3rd party software for the current project
         *
         * @param {TacoUtility.Commands.ICommandData} Options dictionary to be cleansed
         *
         * @return {Q.Promise<any>} A promise that is resolved if the dependencies install successfully, or rejected otherwise
         */
        public run(data: TacoUtility.Commands.ICommandData): Q.Promise<any>;
    }
}

declare module "dependencies-installer" {
    export = DependenciesInstaller;
}