/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

declare module DependencyInstallerInterfaces {
    export interface IStepsDeclaration {
        download: boolean;
        install: boolean;
        updateVariables: boolean;
        postInstall: boolean;
    }

    export interface IInstallerData {
        installSource: string;
        sha1: string;
        bytes: number;
        installDestination?: string;
        downloadSize?: number;
        diskSize?: number;
        steps?: IStepsDeclaration;
    }

    export interface IArchitectureInstallerDictionary {
        [architectureName: string]: IInstallerData;
    }

    export interface IPlatformInstallerDictionary {
        [platformName: string]: IArchitectureInstallerDictionary;
    }

    export interface IVersionDictionary {
        [versionId: string]: IPlatformInstallerDictionary;
    }

    export interface IDependencyData {
        displayName?: string;
        installerPath?: string;
        isImplicit?: boolean;
        licenseUrl?: string;
        prerequisites?: string[];
        versions?: IVersionDictionary;
    }

    export interface IDependencyDictionary {
        [dependencyId: string]: IDependencyData;
    }

    export interface IUnsupportedDependency {
        installHelp: string;
    }

    export interface IUnsupportedDictionary {
        [dependencyId: string]: IUnsupportedDependency;
    }

    export interface IDependencyInstallerMetadata {
        dependencies: IDependencyDictionary;
        unsupported: IUnsupportedDictionary;
    }

    export interface IDependency {
        id: string;
        version: string;
        displayName: string;
        licenseUrl?: string;
        installDestination: string;
    }

    export interface IInstallerConfig {
        dependencies: IDependency[];
    }
}