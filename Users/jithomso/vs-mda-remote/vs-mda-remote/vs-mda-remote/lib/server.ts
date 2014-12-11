/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import express = require('express');
import fs = require('fs');
import http = require('http');
import https = require('https');
import path = require('path');
import Q = require('q');

import bi = require('./buildInfo');
import buildManager = require('./buildManager');
import OSSpecifics = require('./OSSpecifics');
import resources = require('./resources');
import util = require('./util');

module Server {
    export interface Conf {
        get(prop: string): any;
        set(prop: string, value: any): void;
    }

    export function start(conf: Conf): Q.IPromise<any> {
        var app = express();
        app.set('port', conf.get('port'));
        app.set('serverDir', conf.get('serverDir'));
        app.use((<any>express).logger('dev')); // More recent versions of express do not include this functionality, instead it has been moved into separate packages.
        app.use((<any>express).errorHandler());

        // Initialize the build manager (after our app settings are all setup)
        buildManager.init(conf);

        var onlyAuthorizedClientRequest = function (req, res, next) {
            if (!req.client.authorized) {
                res.send(401, resources.getString(req, 'UnauthorizedClientRequest'));
            } else {
                next();
            }
        };

        app.get('/', function (req, res) {
            res.send(200, resources.getString(req, 'IndexPageContent', app.get('port')));
        });

        // These routes are fully secured through client cert verification:
        if (util.argToBool(conf.get('secure')) === true) {
            app.all('/build/*', onlyAuthorizedClientRequest);
            app.all('/files', onlyAuthorizedClientRequest);
        }
        
        app.post('/build/tasks', submitNewBuild);
        app.get('/build/tasks/:id', getBuildStatus);
        app.get('/build/tasks/:id/log', getBuildLog);
        app.get('/build/tasks', getAllBuildStatus);
        app.get('/build/:id', getBuildStatus);
        app.get('/build/:id/download', downloadBuild);

        app.get('/build/:id/emulate', OSSpecifics.osSpecifics.emulateBuild);
        app.get('/build/:id/deploy', OSSpecifics.osSpecifics.deployBuild);
        app.get('/build/:id/run', OSSpecifics.osSpecifics.runBuild);
        app.get('/build/:id/debug', OSSpecifics.osSpecifics.debugBuild);
        app.get('/debugPort', OSSpecifics.osSpecifics.getDebugPort);

        app.get('/certs/:pin', downloadClientCerts);
        //app.get('/resources/:lang', getResources);

        app.use('/files', (<any>express).directory(buildManager.getBaseBuildDir()));
        app.use('/files', express.static(buildManager.getBaseBuildDir()));


        return startupServer(conf, app).
            then(registerShutdownHooks).
            fail(function (err) {
                console.error(resources.getString(conf.get("lang"), "ServerStartFailed"), err);
                if (err.stack) {
                    console.error(err.stack);
                }
            });
    }
    var serverInstance: { close(callback?: Function): void };
    var serverConf: Conf;

    export function stop(callback: Function) {
        serverInstance.close(callback);
    }

    export function resetServerCert(conf: Conf): Q.IPromise<any> {
        return OSSpecifics.osSpecifics.resetServerCert(conf);
    }

    export function generateClientCert(conf: Conf): Q.IPromise<any> {
        return OSSpecifics.osSpecifics.generateClientCert(conf);
    }

    function startupServer(conf: Conf, app: express.Application): Q.Promise<{ close(callback: Function): void }> {
        var isSsl = util.argToBool(conf.get('secure'));
        return (isSsl === true) ? startupHttpsServer(conf, app) : startupPlainHttpServer(conf, app);
    }

    function startupPlainHttpServer(conf: Conf, app: express.Application): Q.Promise<http.Server> {
        return Q(http.createServer(app)).
            then(function (svr) {
                var deferred = Q.defer<http.Server>();
                svr.on('error', function (err) {
                    deferred.reject(friendlyServerListenError(err, conf));
                });
                svr.listen(app.get('port'), function () {
                    serverInstance = svr;
                    serverConf = conf;
                    console.log(resources.getString(conf.get("lang"), "InsecureServerStarted"), app.get('port'));
                    writePid();
                    deferred.resolve(svr);
                });
                return deferred.promise;
            });
    }

    function startupHttpsServer(conf: Conf, app: express.Application) : Q.Promise<https.Server> {
        var generatedNewCerts = false;
        var generatedClientPin;
        return OSSpecifics.osSpecifics.initializeServerCerts(conf).
            then(function (certStore) {
                if (certStore.newCerts === true) {
                    generatedNewCerts = true;
                    conf.set('suppressVisualStudioMessage',true);
                    return OSSpecifics.osSpecifics.generateClientCert(conf).
                        then(function (pin) {
                            generatedClientPin = pin;
                            return certStore;
                        });
                }
                return Q(certStore);
            }).
            then(function (certStore) {
                var sslSettings = {
                    key: certStore.getKey(),
                    cert: certStore.getCert(),
                    ca: certStore.getCA(),
                    requestCert: true,
                    rejectUnauthorized: false
                };
                return https.createServer(sslSettings, app);
            }).
            then(function (svr) {
                var deferred = Q.defer<https.Server>();
                svr.on('error', function (err) {
                    if (generatedNewCerts === true) {
                        OSSpecifics.osSpecifics.removeAllCertsSync(conf);
                    }
                    deferred.reject(friendlyServerListenError(err, conf));
                });
                svr.listen(app.get('port'), function () {
                    serverInstance = svr;
                    serverConf = conf;
                    console.log(resources.getString(conf.get("lang"), "SecureServerStarted"), app.get('port'));
                    writePid();
                    deferred.resolve(svr);
                });
                return Q(deferred.promise);
            });
    }

    function friendlyServerListenError(err, conf: Conf) {
        if (err.code == 'EADDRINUSE') {
            return resources.getString(conf.get("lang"), "ServerPortInUse", conf.get('port'));
        } else {
            return err;
        }
    }

    function writePid() : void {
        if (util.argToBool(serverConf.get('writePidToFile')) === true) {
            fs.writeFile(path.join(serverConf.get('serverDir'), "running_process_id"), process.pid);
        }
    }

    function registerShutdownHooks() {
        // We should have serverConf defined at this point, but just in case fall back to english
        var lang = serverConf && serverConf.get('lang') || 'en';
        // It is strongly recommended in a NodeJs server to kill the process off on uncaughtException.
        process.on('uncaughtException', function (err) {
            console.error(resources.getString(lang, "UncaughtErrorShutdown") + err);
            console.error(err.stack);
            console.info(resources.getString(lang, "ServerShutdown"));
            buildManager.shutdown();
            process.exit(1)
    });

        // Opportunity to clean up builds on exit
        var shutdown = function () {
            console.info(resources.getString(lang, "ServerShutdown"));
            // BUG: Currently if buildManager.shutdown() is called while a build log is being written, rimraf will throw an exception on windows
            buildManager.shutdown();
            serverInstance.close();
            process.exit(0);
        };
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    }


    // Submits a new build task
    function submitNewBuild(req: express.Request, res: express.Response) : void {
        Q.nfcall(buildManager.submitNewBuild, req).then(function (buildInfo: bi.BuildInfo) {
            var contentLocation = ((util.argToBool(serverConf.get('secure')) === true) ? 'https://' : 'http://') +
                req.headers['host'] + '/build/tasks/' + buildInfo.buildNumber;
            res.set({
                'Content-Type': 'application/json',
                'Content-Location': contentLocation
            });
            res.json(202, buildInfo.localize(req));
        }, function (err) {
            res.set({ 'Content-Type': 'application/json' });
            res.send(err.code || 400, { status: resources.getString(req, 'InvalidBuildRequest'), errors: err });
        }).done();
    }

    // Queries on the status of a build task, used by a client to poll
    function getBuildStatus(req: express.Request, res: express.Response) {
        var buildInfo = buildManager.getBuildInfo(req.params.id);
        if (buildInfo !== null) {
            res.json(200, buildInfo.localize(req));
        } else {
            res.send(404, resources.getString(req, 'BuildNotFound', req.params.id));
        }
    }

    // Retrieves log file for a build task, can be used by a client when build failed
    function getBuildLog(req: express.Request, res: express.Response) {
        var buildInfo = buildManager.getBuildInfo(req.params.id);
        if (buildInfo !== null) {
            res.set('Content-Type', 'text/plain');
            buildManager.downloadBuildLog(req.params.id, res);
        } else {
            res.send(404, resources.getString(req, 'BuildNotFound', req.params.id));
        }
    }

    // Queries on the status of all build tasks
    function getAllBuildStatus(req: express.Request, res: express.Response) {
        var allBuildInfo = buildManager.getAllBuildInfo();
        res.json(200, allBuildInfo);
    }

    // Downloads a build as a zip file with .ipa and .plist file
    function downloadBuild(req: express.Request, res: express.Response) {
        var buildInfo = buildManager.getBuildInfo(req.params.id);
        if (buildInfo === null) {
            res.send(404, resources.getString(req, 'BuildNotFound', req.params.id));
            return;
        }
        buildManager.downloadBuild(req.params.id, req, res, function (err, updatedBuildInfo) {
            if (err) {
                res.send(404, err);
            }
        });
    }

    // Downloads client SSL certs (pfx format) for pin specified in request
    function downloadClientCerts(req: express.Request, res: express.Response) {
        OSSpecifics.osSpecifics.downloadClientCerts(req, res);
    }
}

export = Server;