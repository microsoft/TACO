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
        location: string;
        name: string;
    }

    interface ITacoRemoteMultiplexer {
        getPackageSpecForQuery(query: IPropertyBag): IPackageSpec;
    }
}