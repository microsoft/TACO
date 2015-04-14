/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/Q.d.ts" />
/// <reference path="../../typings/nconf.d.ts" />
/// <reference path="../../typings/taco-utils.d.ts" />
/// <reference path="../../typings/express.d.ts" />
/// <reference path="../../typings/express-extensions.d.ts" />
/// <reference path="../../typings/morgan.d.ts" />
/// <reference path="../../typings/errorhandler.d.ts" />
/// <reference path="../../typings/remotebuild.d.ts" />
"use strict";

import errorhandler = require ("errorhandler");
import express = require ("express");
import fs = require ("fs");
import http = require ("http");
import https = require ("https");
import expressLogger = require ("morgan");
import path = require ("path");
import Q = require ("q");

import HostSpecifics = require ("./host-specifics");
import RemoteBuildConf = require ("./remotebuild-conf");
import utils = require ("taco-utils");
import util = require ("util");

import resources = utils.ResourcesManager;
import UtilHelper = utils.UtilHelper;

interface IDictionaryT<T> {
    [index: string]: T;
}

class Server {
    private static Modules: RemoteBuild.IServerModule[] = [];

    private static ServerInstance: { close(callback?: Function): void };
    private static ServerConf: RemoteBuildConf;

    private static ErrorShutdown: (e: any) => void;
    private static Shutdown: () => void;

    public static start(conf: RemoteBuildConf): Q.Promise<any> {
        var app = express();
        app.use(expressLogger("dev"));
        app.use(errorhandler());

        var serverDir = conf.serverDir;
        UtilHelper.createDirectoryIfNecessary(serverDir);

        app.get("/", function (req: express.Request, res: express.Response): void {
            res.status(200).send(resources.getStringForLanguage(req, "IndexPageContent", conf.port));
        });

        app.get("/certs/:pin", HostSpecifics.hostSpecifics.downloadClientCerts);
        app.get("/modules/:module", Server.getModuleMount);

        return Server.initializeServerCapabilities(conf).then(function (serverCapabilities: RemoteBuild.IServerCapabilities): Q.Promise<any> {
            return Server.loadServerModules(conf, app, serverCapabilities);
        }).then(function (): Q.Promise<any> {
            return Server.startupServer(conf, app);
        }).then(Server.registerShutdownHooks)
          .fail(function (err: any): void {
            console.error(resources.getString("ServerStartFailed"), err);
            if (err.stack) {
                console.error(err.stack);
            }

            throw err;
        });
    }

    public static stop(callback: Function): void {
        process.removeListener("uncaughtException", Server.ErrorShutdown);
        process.removeListener("SIGTERM", Server.Shutdown);
        process.removeListener("SIGINT", Server.Shutdown);
        if (Server.ServerInstance) {
            var tempInstance = Server.ServerInstance;
            Server.ServerInstance = null;
            tempInstance.close(callback);
        }
    }

    /**
     * Attempt to test each of the server modules against a separate instance of remotebuild which is assumed to be running with the same configuration
     */
    public static test(conf: RemoteBuildConf): Q.Promise<any> {
        return Server.initializeServerTestCapabilities(conf).then(function (serverTestCaps: RemoteBuild.IServerTestCapabilities): Q.Promise<any> {
            return Server.eachServerModule(conf, function (modGen: RemoteBuild.IServerModuleFactory, mod: string, moduleConfig: RemoteBuild.IServerModuleConfiguration): Q.Promise<any> {
                return modGen.test(conf, moduleConfig, serverTestCaps).then(function (): void {
                    console.log(resources.getString("TestPassed", mod));
                }, function (err: Error): void {
                    console.error(resources.getString("TestFailed", mod));
                    console.error(err);
                    throw err;
                });
            });
        });
    }

    public static resetServerCert(conf: RemoteBuildConf): Q.Promise<any> {
        return HostSpecifics.hostSpecifics.resetServerCert(conf);
    }

    public static generateClientCert(conf: RemoteBuildConf): Q.Promise<any> {
        return HostSpecifics.hostSpecifics.generateClientCert(conf);
    }

    public static initializeServerCapabilities(conf: RemoteBuildConf): Q.Promise<RemoteBuild.IServerCapabilities> {
        var serverCapPromises: Q.Promise<any>[] = [
            conf.secure ? HostSpecifics.hostSpecifics.initializeServerCerts(conf) : Q(null),
            // More capabilities can be exposed here
        ];
        return Q.all(serverCapPromises).spread(function (certStore: HostSpecifics.ICertStore): RemoteBuild.IServerCapabilities {
            var serverCapabilities: RemoteBuild.IServerCapabilities = {};
            if (certStore) {
                serverCapabilities.certStore = certStore;
            }

            return serverCapabilities;
        });
    }

    private static initializeServerTestCapabilities(conf: RemoteBuildConf): Q.Promise<RemoteBuild.IServerTestCapabilities> {
        var serverTestCapPromises: Q.Promise<any>[] = [
            conf.secure ? HostSpecifics.hostSpecifics.getHttpsAgent(conf) : Q(null),
            // More capabilities can be exposed here
        ];
        return Q.all(serverTestCapPromises).spread(function (agent: https.Agent): RemoteBuild.IServerCapabilities {
            var serverTestCapabilities: RemoteBuild.IServerTestCapabilities = {};
            if (agent) {
                serverTestCapabilities.agent = agent;
            }

            return serverTestCapabilities;
        });
    }

    private static loadServerModules(conf: RemoteBuildConf, app: Express.Application, serverCapabilities: RemoteBuild.IServerCapabilities): Q.Promise<any> {
        var onlyAuthorizedClientRequest = function (req: express.Request, res: express.Response, next: Function): void {
            if (!(<any>req).client.authorized) {
                res.status(401).send(resources.getStringForLanguage(req, "UnauthorizedClientRequest"));
            } else {
                next();
            }
        };
        return Server.eachServerModule(conf, function (modGen: RemoteBuild.IServerModuleFactory, mod: string, moduleConfig: RemoteBuild.IServerModuleConfiguration): Q.Promise<any> {
            return modGen.create(conf, moduleConfig, serverCapabilities).then(function (serverMod: RemoteBuild.IServerModule): void {
                var modRouter = serverMod.getRouter();
                // These routes are fully secured through client cert verification:
                if (conf.secure) {
                    app.all("/" + moduleConfig.mountPath, onlyAuthorizedClientRequest);
                }

                app.use("/" + moduleConfig.mountPath, modRouter);
                Server.Modules.push(serverMod);
            });
        });
    }

    private static eachServerModule(conf: RemoteBuildConf, eachFunc: (modGen: RemoteBuild.IServerModuleFactory, mod: string, modConfig: { mountPath: string }) => Q.Promise<any>): Q.Promise<any> {
        var serverMods = conf.modules;
        return serverMods.reduce<Q.Promise<any>>(function (promise: Q.Promise<any>, mod: string): Q.Promise<any> {
            try {
                var modGen: RemoteBuild.IServerModuleFactory = require(mod);
            } catch (e) {
                console.error(resources.getString("UnableToLoadModule", mod));
                return Q.reject(e);
            }

            return promise.then(function (): Q.Promise<any> {
                return eachFunc(modGen, mod, conf.moduleConfig(mod));
            });
        }, Q({}));
    }

    private static startupServer(conf: RemoteBuildConf, app: express.Application): Q.Promise<{ close(callback: Function): void }> {
        var isSsl = utils.UtilHelper.argToBool(conf.get("secure"));
        return isSsl ? Server.startupHttpsServer(conf, app) : Server.startupPlainHttpServer(conf, app);
    }

    private static startupPlainHttpServer(conf: RemoteBuildConf, app: express.Application): Q.Promise<http.Server> {
        return Q(http.createServer(app)).
            then(function (svr: http.Server): Q.Promise<http.Server> {
                var deferred = Q.defer<http.Server>();
                svr.on("error", function (err: any): void {
                    deferred.reject(Server.friendlyServerListenError(err, conf));
                });
                svr.listen(conf.port, function (): void {
                    Server.ServerInstance = svr;
                    Server.ServerConf = conf;
                    console.log(resources.getString("InsecureServerStarted"), conf.port);
                    Server.writePid();
                    deferred.resolve(svr);
                });
                return deferred.promise;
            });
    }

    private static startupHttpsServer(conf: RemoteBuildConf, app: express.Application): Q.Promise<https.Server> {
        var generatedNewCerts = false;
        var generatedClientPin: number;
        return HostSpecifics.hostSpecifics.getServerCerts().
            then(function (certStore: HostSpecifics.ICertStore): Q.Promise<HostSpecifics.ICertStore> {
                if (certStore.newCerts) {
                    generatedNewCerts = true;
                    return HostSpecifics.hostSpecifics.generateClientCert(conf).
                        then(function (pin: number): HostSpecifics.ICertStore {
                            generatedClientPin = pin;
                            return certStore;
                        });
                }

                return Q(certStore);
            }).
            then(function (certStore: HostSpecifics.ICertStore): https.Server {
                var sslSettings = {
                    key: certStore.getKey(),
                    cert: certStore.getCert(),
                    ca: certStore.getCA(),
                    requestCert: true,
                    rejectUnauthorized: false
                };
                return https.createServer(sslSettings, app);
            }).
            then(function (svr: https.Server): Q.Promise<https.Server> {
                var deferred = Q.defer<https.Server>();
                svr.on("error", function (err: any): void {
                    if (generatedNewCerts) {
                        HostSpecifics.hostSpecifics.removeAllCertsSync(conf);
                    }

                    deferred.reject(Server.friendlyServerListenError(err, conf));
                });
                svr.listen(conf.port, function (): void {
                    Server.ServerInstance = svr;
                    Server.ServerConf = conf;
                    console.log(resources.getString("SecureServerStarted"), conf.port);
                    Server.writePid();
                    deferred.resolve(svr);
                });
                return Q(deferred.promise);
            });
    }

    private static friendlyServerListenError(err: any, conf: RemoteBuildConf): string {
        if (err.code === "EADDRINUSE") {
            return resources.getString("ServerPortInUse", conf.port);
        } else {
            return err.toString();
        }
    }

    private static writePid(): void {
        if (utils.UtilHelper.argToBool(Server.ServerConf.get("writePidToFile"))) {
            fs.writeFile(path.join(Server.ServerConf.serverDir, "running_process_id"), process.pid);
        }
    }

    private static registerShutdownHooks(): void {
        // It is strongly recommended in a NodeJs server to kill the process off on uncaughtException.
        Server.ErrorShutdown = function (err: Error): void {
            console.error(resources.getString("UncaughtErrorShutdown"));
            console.error(err);
            console.error((<any>err).stack);
            console.info(resources.getString("ServerShutdown"));
            
            Server.Modules.forEach(function (mod: RemoteBuild.IServerModule): void {
                mod.shutdown();
            });

            process.exit(1);
        };
        process.on("uncaughtException", Server.ErrorShutdown);

        // Opportunity to clean up builds on exit
        Server.Shutdown = function (): void {
            console.info(resources.getString("ServerShutdown"));
            // BUG: Currently if buildManager.shutdown() is called while a build log is being written, rimraf will throw an exception on windows
            Server.Modules.forEach(function (mod: RemoteBuild.IServerModule): void {
                mod.shutdown();
            });
            Server.ServerInstance.close();
            process.exit(0);
        };
        process.on("SIGTERM", Server.Shutdown);
        process.on("SIGINT", Server.Shutdown);
    }

    private static getModuleMount(req: express.Request, res: express.Response): void {
        var mod: string = req.params.module;
        var modConfig = Server.ServerConf.moduleConfig(mod);
        if (mod && modConfig && modConfig.mountPath ) {
            var mountLocation = modConfig.mountPath;
            var contentLocation = util.format("%s://%s:%d/%s", req.protocol, req.host, Server.ServerConf.port, mountLocation);
            res.set({
                "Content-Location": contentLocation
            });
            res.status(200).send(mountLocation);
        } else {
            res.sendStatus(404);
        }
    }
}

export = Server;