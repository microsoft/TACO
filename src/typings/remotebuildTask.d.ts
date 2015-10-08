/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="./Q.d.ts" />
/// <reference path="./remotebuild.d.ts" />

interface IRemoteBuildTask {
    execute(config: RemoteBuild.IRemoteBuildConfiguration, cliArguments?: string[]): Q.Promise<any>;
}
