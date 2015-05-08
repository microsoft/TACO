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
    interface ITacoRemoteMultiplexer {
        dependencyJson: string;

        getPackageIdForQuery(query: IPropertyBag): string;
    }
}