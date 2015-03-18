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
/// <reference path="../../typings/taco-remote.d.ts" />
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
import utils = require ("taco-utils");
import util = require ("util");

import resources = utils.ResourcesManager;
import UtilHelper = utils.UtilHelper;

module Server {
    var modules: TacoRemote.IServerModule[] = [];
    export function start(conf: HostSpecifics.IConf): Q.Promise<any> {
        var app = express();
        app.use(expressLogger("dev"));
        app.use(errorhandler());

        var serverDir = conf.get("serverDir");
        UtilHelper.createDirectoryIfNecessary(serverDir);

        app.get("/", function (req: express.Request, res: express.Response): void {
            res.status(200).send(resources.getStringForLanguage(req, "IndexPageContent", conf.get("port")));
        });

        app.get("/certs/:pin", HostSpecifics.hostSpecifics.downloadClientCerts);
        app.get("/modules/:module", getModuleMount);

        return initializeServerCapabilities(conf).then(function (serverCapabilities: TacoRemote.IServerCapabilities): Q.Promise<any> {
            return loadServerModules(conf, app, serverCapabilities).then(function (): Q.Promise<any> {
                return startupServer(conf, app).
                    then(registerShutdownHooks).
                    fail(function (err: any): void {
                    console.error(resources.getStringForLanguage(conf.get("lang"), "ServerStartFailed"), err);
                    if (err.stack) {
                        console.error(err.stack);
                    }

                    throw err;
                });
            });
        });
    }

    var serverInstance: { close(callback?: Function): void };
    var serverConf: HostSpecifics.IConf;

    var errorShutdown: (e: any) => void;
    var shutdown: () => void;
    export function stop(callback: Function): void {
        process.removeListener("uncaughtException", errorShutdown);
        process.removeListener("SIGTERM", shutdown);
        process.removeListener("SIGINT", shutdown);
        if (serverInstance) {
            var tempInstance = serverInstance;
            serverInstance = null;
            tempInstance.close(callback);
        }
    }

    export function resetServerCert(conf: HostSpecifics.IConf): Q.Promise<any> {
        return HostSpecifics.hostSpecifics.resetServerCert(conf);
    }

    export function generateClientCert(conf: HostSpecifics.IConf): Q.Promise<any> {
        return HostSpecifics.hostSpecifics.generateClientCert(conf);
    }

    function initializeServerCapabilities(conf: TacoRemote.IDict): Q.Promise<TacoRemote.IServerCapabilities> {
        var serverCapPromises: Q.Promise<any>[] = [
            utils.UtilHelper.argToBool(conf.get("secure")) ? HostSpecifics.hostSpecifics.initializeServerCerts(conf) : Q({}),
            // More capabilities can be exposed here
        ];
        return Q.all(serverCapPromises).spread(function (certStore: HostSpecifics.ICertStore): TacoRemote.IServerCapabilities {
            var serverCapabilities: TacoRemote.IServerCapabilities = {};
            if (certStore) {
                serverCapabilities.certStore = certStore;
            }

            return serverCapabilities;
        });
    }

    function loadServerModules(conf: TacoRemote.IDict, app: Express.Application, serverCapabilities: TacoRemote.IServerCapabilities): Q.Promise<any> {
        var onlyAuthorizedClientRequest = function (req: express.Request, res: express.Response, next: Function): void {
            if (!(<any>req).client.authorized) {
                res.status(401).send(resources.getStringForLanguage(req, "UnauthorizedClientRequest"));
            } else {
                next();
            }
        };
        var serverMods: { [mod: string]: string } = conf.get("modules");
        var promise: Q.Promise<any> = Q({});
        if (serverMods) {
            promise = Object.keys(serverMods).reduce<Q.Promise<any>>(function (promise: Q.Promise<any>, mod: string): Q.Promise<any> {
                try {
                    var attachPath = serverMods[mod];
                    var modGen: TacoRemote.IServerModuleFactory = require(mod);
                    return promise.then(function (): Q.Promise<any> {
                        return modGen.create(conf, attachPath, serverCapabilities).then(function (serverMod: TacoRemote.IServerModule): void {
                            var modRouter = serverMod.getRouter();
                            // These routes are fully secured through client cert verification:
                            if (utils.UtilHelper.argToBool(conf.get("secure"))) {
                                app.all("/" + attachPath, onlyAuthorizedClientRequest);
                            }

                            app.use("/" + attachPath, modRouter);
                            modules.push(serverMod);
                        });
                    });
                } catch (e) {
                    console.error(e);
                    return Q.reject(e);
                }
            }, promise);
        } else {
            console.warn(resources.getString("NoServerModulesSelected"));
        }

        return promise;
    }

    function startupServer(conf: HostSpecifics.IConf, app: express.Application): Q.Promise<{ close(callback: Function): void }> {
        var isSsl = utils.UtilHelper.argToBool(conf.get("secure"));
        return isSsl ? startupHttpsServer(conf, app) : startupPlainHttpServer(conf, app);
    }

    function startupPlainHttpServer(conf: HostSpecifics.IConf, app: express.Application): Q.Promise<http.Server> {
        return Q(http.createServer(app)).
            then(function (svr: http.Server): Q.Promise<http.Server> {
                var deferred = Q.defer<http.Server>();
                svr.on("error", function (err: any): void {
                    deferred.reject(friendlyServerListenError(err, conf));
                });
                svr.listen(conf.get("port"), function (): void {
                    serverInstance = svr;
                    serverConf = conf;
                    console.log(resources.getStringForLanguage(conf.get("lang"), "InsecureServerStarted"), conf.get("port"));
                    writePid();
                    deferred.resolve(svr);
                });
                return deferred.promise;
            });
    }

    function startupHttpsServer(conf: HostSpecifics.IConf, app: express.Application): Q.Promise<https.Server> {
        var generatedNewCerts = false;
        var generatedClientPin: number;
        return HostSpecifics.hostSpecifics.getServerCerts().
            then(function (certStore: HostSpecifics.ICertStore): Q.Promise<HostSpecifics.ICertStore> {
                if (certStore.newCerts) {
                    generatedNewCerts = true;
                    conf.set("suppressVisualStudioMessage", true);
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

                    deferred.reject(friendlyServerListenError(err, conf));
                });
                svr.listen(conf.get("port"), function (): void {
                    serverInstance = svr;
                    serverConf = conf;
                    console.log(resources.getStringForLanguage(conf.get("lang"), "SecureServerStarted"), conf.get("port"));
                    writePid();
                    deferred.resolve(svr);
                });
                return Q(deferred.promise);
            });
    }

    function friendlyServerListenError(err: any, conf: HostSpecifics.IConf): string {
        if (err.code === "EADDRINUSE") {
            return resources.getStringForLanguage(conf.get("lang"), "ServerPortInUse", conf.get("port"));
        } else {
            return err.toString();
        }
    }

    function writePid(): void {
        if (utils.UtilHelper.argToBool(serverConf.get("writePidToFile"))) {
            fs.writeFile(path.join(serverConf.get("serverDir"), "running_process_id"), process.pid);
        }
    }

    function registerShutdownHooks(): void {
        // We should have serverConf defined at this point, but just in case fall back to english
        var lang = serverConf && serverConf.get("lang") || "en";
        // It is strongly recommended in a NodeJs server to kill the process off on uncaughtException.
        errorShutdown = function (err: Error): void {
            console.error(resources.getStringForLanguage(lang, "UncaughtErrorShutdown"));
            console.error(err);
            console.error((<any>err).stack);
            console.info(resources.getStringForLanguage(lang, "ServerShutdown"));
            
            modules.forEach(function (mod: TacoRemote.IServerModule): void {
                mod.shutdown();
            });

            process.exit(1);
        };
        process.on("uncaughtException", errorShutdown);

        // Opportunity to clean up builds on exit
        shutdown = function (): void {
            console.info(resources.getStringForLanguage(lang, "ServerShutdown"));
            // BUG: Currently if buildManager.shutdown() is called while a build log is being written, rimraf will throw an exception on windows
            modules.forEach(function (mod: TacoRemote.IServerModule): void {
                mod.shutdown();
            });
            serverInstance.close();
            process.exit(0);
        };
        process.on("SIGTERM", shutdown);
        process.on("SIGINT", shutdown);
    }

    function getModuleMount(req: express.Request, res: express.Response): void {
        var mod: string = req.params.module;
        if (mod && serverConf.get("modules") && serverConf.get("modules")[mod]) {
            var mountLocation = serverConf.get("modules")[mod];
            var contentLocation = util.format("%s://%s:%d/%s", req.protocol, req.host, serverConf.get("port"), mountLocation);
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