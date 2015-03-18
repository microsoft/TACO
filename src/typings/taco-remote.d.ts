/// <reference path="./express.d.ts" />

declare module TacoRemote {
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
    interface IServerModuleFactory {
        create(conf: IDict, modPath: string, serverCapabilities: IServerCapabilities): Q.Promise<TacoRemote.IServerModule>;
    }
    interface IServerModule {
        getRouter(): Express.Router;
        shutdown(): void;
    }
}