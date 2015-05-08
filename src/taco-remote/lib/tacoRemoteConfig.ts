/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/remotebuild.d.ts" />
"use strict";

import HostSpecifics = require ("./hostSpecifics");
import tacoUtils = require ("taco-utils");

import UtilHelper = tacoUtils.UtilHelper;

class TacoRemoteConfig implements RemoteBuild.IReadOnlyDictionary {
    private tacoRemoteConf: {
        lang: string;
        port: number;
        serverDir: string;
        mountPath: string;

        allowsEmulate?: boolean;
        maxBuildsToKeep?: number;
        maxBuildsInQueue?: number;
        deleteBuildsOnShutdown?: boolean;
        redirector?: string;

        nativeDebugProxyPort?: number;
        webDebugProxyDevicePort?: number;
        webDebugProxyPortMin?: number;
        webDebugProxyPortMax?: number;

        [key: string]: any;
    };

    constructor(serverConf: RemoteBuild.IRemoteBuildConfiguration, moduleConf: RemoteBuild.IServerModuleConfiguration) {
        // Create a copy of the data so we don't accidentally modify things
        this.tacoRemoteConf = JSON.parse(JSON.stringify(moduleConf));

        this.tacoRemoteConf.lang = serverConf.lang;
        this.tacoRemoteConf.port = serverConf.port;
        this.tacoRemoteConf.serverDir = serverConf.serverDir;

        var defaults: any = {
            maxBuildsInQueue: 10,
            maxBuildsToKeep: 20,
            deleteBuildsOnShutdown: true,
            allowsEmulate: true
        };
        var hostDefaults = HostSpecifics.hostSpecifics.defaults(defaults);
        var self = this;
        Object.keys(hostDefaults).forEach(function (key: string): void {
            if (typeof (self.tacoRemoteConf[key]) === "undefined") {
                self.tacoRemoteConf[key] = hostDefaults[key];
            }
        });
    }

    public get allowsEmulate(): boolean {
        return UtilHelper.argToBool(this.tacoRemoteConf.allowsEmulate);
    }

    public get deleteBuildsOnShutdown(): boolean {
        return UtilHelper.argToBool(this.tacoRemoteConf.deleteBuildsOnShutdown);
    }

    public get maxBuildsInQueue(): number {
        return this.tacoRemoteConf.maxBuildsInQueue;
    }

    public get maxBuildsToKeep(): number {
        return this.tacoRemoteConf.maxBuildsToKeep;
    }

    public get serverDir(): string {
        return this.tacoRemoteConf.serverDir;
    }

    public get lang(): string {
        return this.tacoRemoteConf.lang;
    }

    public get port(): number {
        return this.tacoRemoteConf.port;
    }

    public get(prop: string): any {
        return this.tacoRemoteConf[prop];
    }
}

export = TacoRemoteConfig;
