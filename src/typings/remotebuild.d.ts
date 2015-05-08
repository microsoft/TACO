/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="./express.d.ts" />
/// <reference path="./node.d.ts" />
/// <reference path="./Q.d.ts" />

declare module RemoteBuild {
    interface IReadOnlyDictionary {
        get(prop: string): any;
    }
    interface IDictionary extends IReadOnlyDictionary {
        set(prop: string, value: any): void
    }
    interface IRemoteBuildConfiguration {
        lang: string;
        port: number;
        serverDir: string;
        secure: boolean;
        hostname: string;
    }
    interface IServerModuleConfiguration {
        mountPath: string;
        requirePath?: string;
        [prop: string]: any;
    }
    interface ICertStore {
        getKey: () => Buffer;
        getCert: () => Buffer;
        getCA: () => Buffer;
    }
    interface IServerCapabilities {
        certStore?: ICertStore;
    }
    interface IServerTestCapabilities {
        agent?: NodeJSHttp.Agent;
    }
    interface IServerModuleFactory {
        create(remoteBuildConf: IRemoteBuildConfiguration, moduleConfig: IServerModuleConfiguration, serverCapabilities: IServerCapabilities): Q.Promise<RemoteBuild.IServerModule>;
        test(remoteBuildConf: IRemoteBuildConfiguration, moduleConfig: IServerModuleConfiguration, serverTestCapabilities: IServerTestCapabilities): Q.Promise<any>; // When remotebuild is invoked in testing mode, it will call for the modules to test themselves against a separate instance of the server running in the normal mode
    }
    interface IServerModule {
        getRouter(): Express.Router;
        shutdown(): void;
    }
}
