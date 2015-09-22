/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */
/// <reference path="tacoUtils.d.ts" />
declare module TacoRemote {
    interface IServerInfo { metrics: any; queued: number; currentBuild: TacoUtility.BuildInfo; queuedBuilds: TacoUtility.BuildInfo[]; allBuilds: any }
}