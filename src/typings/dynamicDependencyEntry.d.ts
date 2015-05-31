/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />

interface IDynamicDependencyEntry {
    packageName: string;
    packageId: string;
    localPath: string; // for development scenarios
    expirationIntervalInHours?: number;
}
