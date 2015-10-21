/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />

declare module TacoTestsUtils {
    interface IComponentVersionMap {
        [component: string]: string;
    }

    class ProjectHelper {
        public static checkPlatformVersions(platformsExpected: IComponentVersionMap, projectPath: string): Q.Promise<any>;
        public static checkPluginVersions(pluginsExpected: IComponentVersionMap, projectPath: string): void;
    }
}

