/// <reference path="../../typings/remotebuild.d.ts" />
/// <reference path="../../typings/express.d.ts" />
/// <reference path="../../typings/node.d.ts" />

import express = require ("express");
import Q = require ("q");

class TestServerModuleFactory {
    public static create(conf: RemoteBuild.IRemoteBuildConfiguration, modConfig: RemoteBuild.IServerModuleConfiguration, serverCapabilities: RemoteBuild.IServerCapabilities): Q.Promise<RemoteBuild.IServerModule> {
        TestServerModuleFactory.TestServerModule.modConfig = modConfig;
        return Q(new TestServerModuleFactory.TestServerModule());
    }
}

module TestServerModuleFactory {
    export class TestServerModule implements RemoteBuild.IServerModule {
        public static isShutDown: boolean = false;
        public static lastReq: Express.Request = null;
        public static modConfig: RemoteBuild.IServerModuleConfiguration = null;

        public getRouter(): Express.Router {
            var router: Express.Router = express.Router();
            router.all("*", function (req: Express.Request, res: Express.Response): void {
                TestServerModule.lastReq = req;
                res.sendStatus(200);
            });

            return router;
        }

        public shutdown(): void {
            TestServerModule.isShutDown = true;
        }
    }
}

export = TestServerModuleFactory;
