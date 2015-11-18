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

        appLaunchStepTimeout?: number;

        [key: string]: any;
    };

    constructor(serverConf: RemoteBuild.IRemoteBuildConfiguration, moduleConf: RemoteBuild.IServerModuleConfiguration) {
        // Create a copy of the data so we don't accidentally modify things
        this.tacoRemoteConf = JSON.parse(JSON.stringify(moduleConf));

        this.tacoRemoteConf.lang = serverConf.lang;
        this.tacoRemoteConf.port = serverConf.port;
        this.tacoRemoteConf.serverDir = serverConf.serverDir;

        var defaults: { [key: string]: any } = {
            maxBuildsInQueue: 10,
            maxBuildsToKeep: 20,
            deleteBuildsOnShutdown: true,
            allowsEmulate: true,
            appLaunchStepTimeout: 10000
        };
        var hostDefaults: { [key: string]: any } = HostSpecifics.hostSpecifics.defaults(defaults);
        var self: TacoRemoteConfig = this;
        Object.keys(hostDefaults).forEach(function (key: string): void {
            if (typeof (self.tacoRemoteConf[key]) === "undefined") {
                self.tacoRemoteConf[key] = hostDefaults[key];
            }
        });
    }

    /**
     * @name allowsEmulate
     */
    public get allowsEmulate(): boolean {
        return tacoUtils.ArgsHelper.argToBool(this.tacoRemoteConf.allowsEmulate);
    }

    /**
     * @name deleteBuildsOnShutdown
     */
    public get deleteBuildsOnShutdown(): boolean {
        return tacoUtils.ArgsHelper.argToBool(this.tacoRemoteConf.deleteBuildsOnShutdown);
    }

    /**
     * @name maxBuildsInQueue
     */
    public get maxBuildsInQueue(): number {
        return this.tacoRemoteConf.maxBuildsInQueue;
    }

    /**
     * @name maxBuildsToKeep
     */
    public get maxBuildsToKeep(): number {
        return this.tacoRemoteConf.maxBuildsToKeep;
    }

    /**
     * @name nativeDebugProxyPort
     */
    public get nativeDebugProxyPort(): number {
        return this.tacoRemoteConf.nativeDebugProxyPort;
    }

    /**
     * @name webDebugProxyDevicePort
     */
    public get webDebugProxyDevicePort(): number {
        return this.tacoRemoteConf.webDebugProxyDevicePort;
    }

    /**
     * @name webDebugProxyPortMin
     */
    public get webDebugProxyPortMin(): number {
        return this.tacoRemoteConf.webDebugProxyPortMin;
    }

    /**
     * @name webDebugProxyPortMax
     */
    public get webDebugProxyPortMax(): number {
        return this.tacoRemoteConf.webDebugProxyPortMax;
    }

    public get appLaunchStepTimeout(): number {
        return this.tacoRemoteConf.appLaunchStepTimeout;
    }

    // These three properties are inherited from the parent configuration; no need for separate documentation
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

    public serialize(): RemoteBuild.IServerModuleConfiguration {
        var confCopy = JSON.parse(JSON.stringify(this.tacoRemoteConf));
        // These three properties are taken from the root config, and are not individually configurable. Remove them when saving.
        delete confCopy.lang;
        delete confCopy.port;
        delete confCopy.serverDir;

        return confCopy;
    }
}

export = TacoRemoteConfig;
