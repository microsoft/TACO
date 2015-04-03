/// <reference path="../../typings/remotebuild.d.ts" />
import HostSpecifics = require ("./host-specifics");
import tacoUtils = require ("taco-utils");
import UtilHelper = tacoUtils.UtilHelper;

class TacoCordovaConf {
    private tacoCordovaConf: {
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

    constructor(serverConf: RemoteBuild.IDict) {
        // Create a copy of the data so we don't accidentally modify things
        this.tacoCordovaConf = JSON.parse(JSON.stringify(serverConf.get("modules:taco-remote")));

        this.tacoCordovaConf.lang = serverConf.get("lang");
        this.tacoCordovaConf.port = serverConf.get("port");
        this.tacoCordovaConf.serverDir = serverConf.get("serverDir");

        var defaults: any = {
            maxBuildsInQueue: 10,
            maxBuildsToKeep: 20,
            deleteBuildsOnShutdown: true,
            allowsEmulate: true
        };
        var hostDefaults = HostSpecifics.hostSpecifics.defaults(defaults);
        var self = this;
        Object.keys(hostDefaults).forEach(function (key: string): void {
            if (typeof (self.tacoCordovaConf[key]) === "undefined") {
                self.tacoCordovaConf[key] = hostDefaults[key];
            }
        });
    }

    public get allowsEmulate(): boolean {
        return UtilHelper.argToBool(this.tacoCordovaConf.allowsEmulate);
    }

    public get deleteBuildsOnShutdown(): boolean {
        return UtilHelper.argToBool(this.tacoCordovaConf.deleteBuildsOnShutdown);
    }

    public get maxBuildsInQueue(): number {
        return this.tacoCordovaConf.maxBuildsInQueue;
    }

    public get maxBuildsToKeep(): number {
        return this.tacoCordovaConf.maxBuildsToKeep;
    }

    public get serverDir(): string {
        return this.tacoCordovaConf.serverDir;
    }

    public get lang(): string {
        return this.tacoCordovaConf.lang;
    }

    public get port(): number {
        return this.tacoCordovaConf.port;
    }

    public get(prop: string): any {
        return this.tacoCordovaConf[prop];
    }
}

export = TacoCordovaConf;