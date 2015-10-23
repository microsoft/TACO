/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />

declare module TacoTestsUtils {
    interface IKeyValuePair<T> {
        [key: string]: T;
    }

    class ProjectHelper {
        public static checkPlatformVersions(platformsExpected: IKeyValuePair<string>, projectPath: string): Q.Promise<any>;
        public static checkPluginVersions(pluginsExpected: IKeyValuePair<string>, projectPath: string): void;
    }
}

