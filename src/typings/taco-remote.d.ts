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
        test(conf: IDict, modPath: string): Q.Promise<any>; // When taco-remote is invoked in testing mode, it will call for the modules to test themselves against a separate instance of the server running in the normal mode
    }
    interface IServerModule {
        getRouter(): Express.Router;
        shutdown(): void;
    }
}