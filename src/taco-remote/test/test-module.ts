/// <reference path="../../typings/taco-remote.d.ts" />
/// <reference path="../../typings/express.d.ts" />

import express = require ("express");
import Q = require ("q");

module TestServerModuleFactory {
    export function create(conf: TacoRemote.IDict, modPath: string): Q.Promise<TacoRemote.IServerModule> {
        TestServerModule.ModPath = modPath;
        return Q(new TestServerModule());
    }

    export class TestServerModule implements TacoRemote.IServerModule {
        public static IsShutDown: boolean = false;
        public static LastReq: Express.Request = null;
        public static ModPath: string = null;
        constructor() {}
        public getRouter(): Express.Router {
            var router = express.Router();
            router.all("*", function (req: Express.Request, res: Express.Response): void {
                TestServerModule.LastReq = req;
                res.sendStatus(200);
            });

            return router;
        }

        public shutdown(): void {
            TestServerModule.IsShutDown = true;
        }
    }
}

export = TestServerModuleFactory;