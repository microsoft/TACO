/// <reference path="./express.d.ts" />
/// <reference path="./node.d.ts" />
/// <reference path="./Q.d.ts" />

declare module RemoteBuild {
    interface IDict {
        get(prop: string): any;
        set(prop: string, value: any): void
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
        create(conf: IDict, modPath: string, serverCapabilities: IServerCapabilities): Q.Promise<RemoteBuild.IServerModule>;
        test(conf: IDict, modPath: string, serverTestCapabilities: IServerTestCapabilities): Q.Promise<any>; // When remotebuild is invoked in testing mode, it will call for the modules to test themselves against a separate instance of the server running in the normal mode
    }
    interface IServerModule {
        getRouter(): Express.Router;
        shutdown(): void;
    }
}