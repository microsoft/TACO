/// <reference path="../../typings/remotebuild.d.ts" />
/// <reference path="../../typings/express.d.ts" />

import express = require ("express");
import Q = require ("q");

class TestServerModuleFactory {
    public static create(conf: RemoteBuild.IRemoteBuildConfiguration, modConfig: RemoteBuild.IServerModuleConfiguration, serverCapabilities: RemoteBuild.IServerCapabilities): Q.Promise<RemoteBuild.IServerModule> {
        TestServerModuleFactory.TestServerModule.ModConfig = modConfig;
        return Q(new TestServerModuleFactory.TestServerModule());
    }
}

module TestServerModuleFactory {
    export class TestServerModule implements RemoteBuild.IServerModule {
        public static IsShutDown: boolean = false;
        public static LastReq: Express.Request = null;
        public static ModConfig: RemoteBuild.IServerModuleConfiguration = null;
        constructor() { }
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