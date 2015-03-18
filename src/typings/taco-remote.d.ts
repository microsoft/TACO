/// <reference path="./express.d.ts" />

declare module TacoRemote {
    interface IDict {
        get(prop: string): any;
        set(prop: string, value: any): void
    }
    interface IServerModuleFactory {
        create(conf: IDict, modPath: string): Q.Promise<TacoRemote.IServerModule>;
    }
    interface IServerModule {
        getRouter(): Express.Router;
        shutdown(): void;
    }
}