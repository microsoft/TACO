/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />

interface IProjectInfo {
    isTacoProject: boolean;
    cordovaCliVersion: string;
    configXmlPath: string;
    tacoKitId?: string;
}
