/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

declare module TacoRemoteMultiplexer {
    interface IPropertyBag {
        [property: string]: string;
    }

    interface IPackageSpec {
        packageKey: string;
        dependencyConfigPath: string;
    }

    interface ITacoRemoteMultiplexer {
        getPackageSpecForQuery(query: IPropertyBag): IPackageSpec;
    }
}