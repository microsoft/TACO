/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/Q.d.ts" />
/// <reference path="../../typings/tacoUtils.d.ts" />
/// <reference path="../../typings/express.d.ts" />
/// <reference path="../../typings/expressExtensions.d.ts" />
/// <reference path="../../typings/helmet.d.ts" />
/// <reference path="../../typings/morgan.d.ts" />
/// <reference path="../../typings/errorhandler.d.ts" />
/// <reference path="../../typings/remotebuild.d.ts" />
"use strict";

import errorhandler = require ("errorhandler");
import express = require ("express");
import fs = require ("fs");
import helmet = require ("helmet");
import http = require ("http");
import https = require ("https");
import expressLogger = require ("morgan");
import path = require ("path");
import Q = require ("q");
import semver = require ("semver");
import util = require ("util");
import os = require("os");

import HostSpecifics = require ("./hostSpecifics");
import RemoteBuildConf = require ("./remoteBuildConf");
import resources = require ("../resources/resourceManager");
import utils = require ("taco-utils");

import Logger = utils.Logger;
import UtilHelper = utils.UtilHelper;

interface IDictionaryT<T> {
    [index: string]: T;
}

class Server {
    private static modules: RemoteBuild.IServerModule[] = [];

    private static serverInstance: { close(callback?: Function): void };
    private static serverConf: RemoteBuildConf;

    private static errorShutdown: (e: any) => void;
    private static shutdown: () => void;

    public static start(conf: RemoteBuildConf): Q.Promise<any> {
        var app: Express.Express = express();
        app.use(expressLogger("dev"));
        app.use(errorhandler());
        if (conf.secure) {
            app.use(helmet.hsts({ // Using recommended settings from https://certsimple.com/blog/a-plus-node-js-ssl
                maxAge: 1000 * 60 * 60 * 24 * 365, // one year in milliseconds
                includeSubdomains: true,
                force: true
            }));
        }

        var serverDir: string = conf.serverDir;
        UtilHelper.createDirectoryIfNecessary(serverDir);

        app.get("/", function (req: express.Request, res: express.Response): void {
            res.status(200).send(resources.getStringForLanguage(req, "IndexPageContent", conf.port));
        });

        app.get("/certs/:pin", HostSpecifics.hostSpecifics.downloadClientCerts);
        app.get("/modules/:module", Server.getModuleMount);

        return utils.TelemetryHelper.generate("start",
                    (telemetry: utils.TelemetryGenerator) => {
                        telemetry
                            .add("isSecure", conf.secure, false)
                            .add("nodeVersion", process.version.indexOf("v") === 0 ? process.version.slice(1) : process.version, false);
                            
                    return Server.initializeServerCapabilities(conf).then(function (serverCapabilities: RemoteBuild.IServerCapabilities): Q.Promise<any> {
                        return Server.loadServerModules(conf, app, serverCapabilities);
                    }).then(function (): Q.Promise<any> {
                        return Server.startupServer(conf, app);
                    }).then(Server.registerShutdownHooks).then(function (): void {
                        Logger.log(resources.getString("CheckSettingsForInfo", conf.configFileLocation));
                    })
                    .fail(function (err: any): void {
                        Logger.logError(resources.getString("ServerStartFailed", err));
                        if (err.stack) {
                            Logger.logError(err.stack);
                        }
            
                        throw err;
                    });
            });
    }

    public static stop(callback?: Function): void {
        process.removeListener("uncaughtException", Server.errorShutdown);
        process.removeListener("SIGTERM", Server.shutdown);
        process.removeListener("SIGINT", Server.shutdown);
        if (Server.serverInstance) {
            var tempInstance: { close(callback?: Function): void } = Server.serverInstance;
            Server.serverInstance = null;
            tempInstance.close(callback);
        } else if (callback) {
            callback(null);
        }
    }

    /**
     * Attempt to test each of the server modules against a separate instance of remotebuild which is assumed to be running with the same configuration
     */
    public static test(conf: RemoteBuildConf, cliArguments: string[]): Q.Promise<any> {
        return Server.initializeServerTestCapabilities(conf).then(function (serverTestCaps: RemoteBuild.IServerTestCapabilities): Q.Promise<any> {
            return Server.eachServerModule(conf, function (modGen: RemoteBuild.IServerModuleFactory, mod: string, moduleConfig: RemoteBuild.IServerModuleConfiguration): Q.Promise<any> {
                return modGen.test(conf, moduleConfig, serverTestCaps, cliArguments).then(function (): void {
                    Logger.log(resources.getString("TestPassed", mod));
                }, function (err: Error): void {
                    Logger.logError(resources.getString("TestFailed", mod));
                    Logger.logError(err.message);
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

    public static saveConfig(conf: RemoteBuildConf): Q.Promise<any> {
        return Server.eachServerModule(conf, function (modGen: RemoteBuild.IServerModuleFactory, mod: string, moduleConfig: RemoteBuild.IServerModuleConfiguration): Q.Promise<any> {
            conf.setModuleConfig(mod, modGen.getConfig(conf, moduleConfig));
            return Q({});
        }).then(function (): void {
            conf.save();
        });
    }

    private static initializeServerCapabilities(conf: RemoteBuildConf): Q.Promise<RemoteBuild.IServerCapabilities> {
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
        if (conf.usingDefaultModulesConfig) {
            Logger.logWarning(resources.getString("NoServerModulesSelected"));
        }

        var onlyAuthorizedClientRequest: (req: express.Request, res: express.Response, next: Function) => void = function (req: express.Request, res: express.Response, next: Function): void {
            if (!(<any> req).client.authorized) {
                res.status(401).send(resources.getStringForLanguage(req, "UnauthorizedClientRequest"));
            } else {
                next();
            }
        };
        return Server.eachServerModule(conf, function (modGen: RemoteBuild.IServerModuleFactory, mod: string, moduleConfig: RemoteBuild.IServerModuleConfiguration): Q.Promise<any> {
            return modGen.create(conf, moduleConfig, serverCapabilities).then(function (serverMod: RemoteBuild.IServerModule): void {
                var modRouter: Express.Router = serverMod.getRouter();
                // These routes are fully secured through client cert verification:
                if (conf.secure) {
                    app.all("/" + moduleConfig.mountPath, onlyAuthorizedClientRequest);
                }

                app.use("/" + moduleConfig.mountPath, modRouter);
                Server.modules.push(serverMod);
            });
        });
    }

    private static eachServerModule(conf: RemoteBuildConf, eachFunc: (modGen: RemoteBuild.IServerModuleFactory, mod: string, modConfig: { mountPath: string }) => Q.Promise<any>): Q.Promise<any> {
        return utils.PromisesUtils.chain(conf.modules, mod => {
            try {
                var requirePath: string = conf.moduleConfig(mod).requirePath || mod;
                var modGen: RemoteBuild.IServerModuleFactory = require(requirePath);
            } catch (e) {
                Logger.logError(resources.getString("UnableToLoadModule", mod));
                return Q.reject(e);
            }
            return eachFunc(modGen, mod, conf.moduleConfig(mod));
        });
    }

    private static startupServer(conf: RemoteBuildConf, app: express.Application): Q.Promise<{ close(callback: Function): void }> {
        return conf.secure ? Server.startupHttpsServer(conf, app) : Server.startupPlainHttpServer(conf, app);
    }

    private static startupPlainHttpServer(conf: RemoteBuildConf, app: express.Application): Q.Promise<http.Server> {
        return Q(http.createServer(app)).
            then(function (svr: http.Server): Q.Promise<http.Server> {
                var deferred: Q.Deferred<http.Server> = Q.defer<http.Server>();
                svr.on("error", function (err: any): void {
                    deferred.reject(Server.friendlyServerListenError(err, conf));
                });
                svr.listen(conf.port, function (): void {
                    Server.serverInstance = svr;
                    Server.serverConf = conf;
                    Logger.log(resources.getString("InsecureServerStarted", conf.port));
                    Server.writePid();
                    deferred.resolve(svr);
                });
                return deferred.promise;
            });
    }

    private static startupHttpsServer(conf: RemoteBuildConf, app: express.Application): Q.Promise<https.Server> {
        var generatedNewCerts: boolean = false;
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
                var cipherList: string[] = ["ECDHE-ECDSA-AES256-GCM-SHA384",
                    "ECDHE-ECDSA-AES128-GCM-SHA256",
                    "ECDHE-RSA-AES256-SHA384",
                    "ECDHE-RSA-AES128-SHA256",
                    "ECDHE-RSA-AES256-SHA",
                    "ECDHE-RSA-AES128-SHA",
                    "DHE-RSA-AES256-GCM-SHA384",
                    "DHE-RSA-AES128-GCM-SHA256",
                    "DHE-RSA-AES256-SHA256",
                    "DHE-RSA-AES256-SHA256",
                    "DHE-RSA-AES128-SHA256",
                    "DHE-RSA-AES256-SHA",
                    "DHE-RSA-AES128-SHA",
                    "!aNULL",
                    "!eNULL",
                    "!EXPORT",
                    "!DES",
                    "!RC4",
                    "!MD5",
                    "!PSK",
                    "!SRP",
                    "!CAMELLIA"];
                // TLS 1.2 is only supported in nodejs version 0.12.0 and greater, but TLS 1.0 is supported in nodejs version 0.10.0 and greater
                // Prior to 0.10.0 the option is not exposed, and we do not support that.
                // See https://github.com/nodejs/node/blob/0439a28d519fb6efe228074b0588a59452fc1677/ src / node_crypto.cc#L295 for an example
                // of where these protocol strings come from / are used.
                var protocol: string = semver.gte(process.versions.node, "0.12.0") ? "TLSv1_2_server_method" : "TLSv1_server_method";
                var sslSettings: https.ServerOptions = {
                    key: certStore.getKey(),
                    cert: certStore.getCert(),
                    ca: certStore.getCA(),
                    ciphers: cipherList.join(":"),
                    honorCipherOrder: true,
                    secureProtocol: protocol,
                    requestCert: true,
                    rejectUnauthorized: false
                };
                return https.createServer(sslSettings, app);
            }).
            then(function (svr: https.Server): Q.Promise<https.Server> {
                var deferred: Q.Deferred<https.Server> = Q.defer<https.Server>();
                svr.on("error", function (err: any): void {
                    if (generatedNewCerts) {
                        HostSpecifics.hostSpecifics.removeAllCertsSync(conf);
                    }

                    deferred.reject(Server.friendlyServerListenError(err, conf));
                });
                svr.listen(conf.port, function (): void {
                    Server.serverInstance = svr;
                    Server.serverConf = conf;
                    Logger.log(resources.getString("SecureServerStarted", conf.port));
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
        if (utils.ArgsHelper.argToBool(Server.serverConf.get("writePidToFile"))) {
            fs.writeFile(path.join(Server.serverConf.serverDir, "running_process_id"), process.pid);
        }
    }

    private static registerShutdownHooks(): void {
        // It is strongly recommended in a NodeJs server to kill the process off on uncaughtException.
        Server.errorShutdown = function (err: Error): void {
            Logger.logError(resources.getString("UncaughtErrorShutdown"));
            Logger.logError(err.message);
            var stack: any = (<any> err).stack;
            if (stack) {
                Logger.logError(stack);
            }
            Logger.log(resources.getString("ServerShutdown"));
            Server.modules.forEach(function (mod: RemoteBuild.IServerModule): void {
                mod.shutdown();
            });

            process.exit(1);
        };
        process.on("uncaughtException", Server.errorShutdown);

        // Opportunity to clean up builds on exit
        Server.shutdown = function (): void {
            Logger.log(resources.getString("ServerShutdown"));
            // BUG: Currently if buildManager.shutdown() is called while a build log is being written, rimraf will throw an exception on windows
            Server.modules.forEach(function (mod: RemoteBuild.IServerModule): void {
                mod.shutdown();
            });
            Server.serverInstance.close();
            process.exit(0);
        };
        process.on("SIGTERM", Server.shutdown);
        process.on("SIGINT", Server.shutdown);
    }

    private static getModuleMount(req: express.Request, res: express.Response): void {
        var mod: string = req.params.module;
        var modConfig: RemoteBuild.IServerModuleConfiguration = Server.serverConf.moduleConfig(mod);
        if (mod && modConfig && modConfig.mountPath ) {
            var mountLocation: string = modConfig.mountPath;
            var contentLocation: string = util.format("%s://%s:%d/%s", req.protocol, req.hostname, Server.serverConf.port, mountLocation);
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
