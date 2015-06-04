/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

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

    export interface IVersionDictionary {
        [versionId: string]: IPlatformInstallerDictionary;
    }

    export interface IDependencyData {
        displayName?: string;
        isImplicit?: boolean;
        licenseUrl?: string;
        prerequisites?: string[];
        versions?: IVersionDictionary;
    }

    export interface IDependencyDictionary {
        [dependencyId: string]: IDependencyData;
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