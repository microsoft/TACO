/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */
/// <reference path="../../typings/mocha.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/request.d.ts" />
/// <reference path="../../typings/should.d.ts" />
/// <reference path="../../typings/nconf.d.ts" />
/// <reference path="../../typings/rimraf.d.ts" />
/// <reference path="../../typings/mkdirp.d.ts" />
"use strict";
var should_module = require("should"); // Note not import: We don't want to refer to should_module, but we need the require to occur since it modifies the prototype of Object.

import fs = require ("fs");
import nconf = require ("nconf");
import os = require ("os");
import path = require ("path");
import rmdir = require ("rimraf");
import mkdirp = require ("mkdirp");

import certs = require ("../lib/darwin/darwin-certs");
import HostSpecifics = require ("../lib/host-specifics");
import RemoteBuildConf = require ("../lib/remotebuild-conf");

import utils = require ("taco-utils");
import resources = utils.ResourcesManager;

var serverDir = path.join(__dirname, "out");
var certsDir = path.join(serverDir, "certs");
var clientCertsDir = path.join(certsDir, "client");
var caKeyPath = path.join(certsDir, "ca-key.pem");
var caCertPath = path.join(certsDir, "ca-cert.pem");

// Tests for lib/darwin/darwin-certs.js functionality
// Since the certs use openSSL to work with certificates, we restrict these tests to the mac where openSSL should exist.
var macOnly = os.platform() === "darwin" ? describe : describe.skip;
macOnly("Certs", function (): void {
    beforeEach(function (): void {
        rmdir.sync(certsDir);
        mkdirp.sync(certsDir);
    });

    after(function (done: MochaDone): void {
        nconf.overrides({});
        rmdir(certsDir, done);
    });
    
    before(function (): void {
        nconf.use("memory");
        resources.init("en", path.join(__dirname, "..", "resources"));
    });

    // These tests can take a fair amount of time
    this.timeout(5000);
    
    // Test that initializing server certificates creates new certificates
    it("InitializeServerCerts", function (done: MochaDone): void {
        certs.initializeServerCerts(conf({ serverDir: serverDir })).
            then(function (certPaths: HostSpecifics.ICertStore): void {
            certPaths.newCerts.should.equal(true, "Expect newCerts true from initializeServerCerts");
            testServerCertsExist();
        }).done(function (): void {
            done();
        }, done);
    });
    
    // Test that initializing server certificates does not re-create certificates if they already exist
    it("InitializeServerCertsWhenCertsAlreadyExist", function (done: MochaDone): void {
        certs.initializeServerCerts(conf({ serverDir: serverDir, suppressSetupMessage: true })).
            then(function (certPaths: HostSpecifics.ICertStore): Q.Promise<HostSpecifics.ICertStore> {
            certPaths.newCerts.should.equal(true, "Expect newCerts true from first initializeServerCerts");
            testServerCertsExist();
            return certs.initializeServerCerts(conf({ serverDir: serverDir, suppressSetupMessage: true }));
        }).
            then(function (certPaths: HostSpecifics.ICertStore): void {
            certPaths.newCerts.should.equal(false, "Expect newCerts false from second initializeServerCerts");
            testServerCertsExist();
        }).done(function (): void {
            done();
        }, done);
    });
    
    // Tests that generating a client certificate creates a certificate and returns a valid pin
    it("GenerateClientCert", function (done: MochaDone): void {
        certs.initializeServerCerts(conf({ serverDir: serverDir })).
            then(function (certPaths: HostSpecifics.ICertStore): Q.Promise<number> {
            return certs.generateClientCert(conf({ serverDir: serverDir }));
        }).
            then(function (pin: number): void {
            should.assert(pin && pin >= 100000 && pin <= 999999, "pin should be a 6 digit number when client cert created");
            should.assert(fs.existsSync(path.join(clientCertsDir, "" + pin, "client.pfx")), "client.pfx should exist in pin directory after client cert created");
        }).done(function (): void {
            done();
        }, done);
    });
    
    // Tests that generating a client certificate without appropriate server certificates fails
    it("GenerateClientCertWhenServerCertsDoNotExist", function (done: MochaDone): void {
        certs.generateClientCert(conf({ serverDir: serverDir })).
        then(function (pin: number): void {
            throw "PIN should not be returned";
        }, function (error: any): void {
            // We should get an error if we try to create client certificates when there is no server certificate
        }).done(function (): void {
            done();
        }, done);
    });
    
    // Tests that resetting server certificates queries the user and respects a "no" response
    it("ResetServerCertNo", function (done: MochaDone): void {
        var noHandler = {
            closed: false,
            question: function (question: string, answerCallback: (answer: string) => void): void {
                answerCallback("n");
            },
            close: function (): void {
                this.closed = true;
            }
        };
        var originalCertInode: number;

        certs.initializeServerCerts(conf({ serverDir: serverDir })).
            then(function (): void {
            originalCertInode = fs.statSync(path.join(certsDir, "server-cert.pem")).ino;
        }).
            then(function (): Q.Promise<any> {
            return certs.resetServerCert(conf({ serverDir: serverDir }), noHandler);
        }).
            then(function (): void {
            fs.statSync(path.join(certsDir, "server-cert.pem")).ino.should.equal(originalCertInode,
                "server-cert.pem should not have changed from original one");
            noHandler.closed.should.equal(true, "yesOrNo prompt should have had close() called on it.");
        }).done(function (): void {
            done();
        }, done);
    });
    
    // Tests that resetting server certificates will create new certificates after a "yes" response
    it("ResetServerCertYes", function (done: MochaDone): void {
        var yesHandler = {
            closed: false,
            question: function (question: string, answerCallback: (answer: string) => void): void {
                answerCallback("y");
            },
            close: function (): void {
                this.closed = true;
            }
        };
        var originalCertInode: number;

        certs.initializeServerCerts(conf({ serverDir: serverDir })).
            then(function (): void {
            originalCertInode = fs.statSync(path.join(certsDir, "server-cert.pem")).ino;
        }).
            then(function (): Q.Promise<any> {
            return certs.resetServerCert(conf({ serverDir: serverDir, suppressSetupMessage: true }), yesHandler);
        }).
            then(function (): void {
            fs.statSync(path.join(certsDir, "server-cert.pem")).ino.should.not.equal(originalCertInode,
                "New server-cert.pem should have been created");
            yesHandler.closed.should.equal(true, "yesOrNo prompt should have had close() called on it.");
        }).done(function (): void {
            done();
        }, done);
    });
    
    // Test that client certificates are purged if they are older than the timeout, and are not purged if they are younger
    it("PurgeExpiredPinBasedClientCertsSync", function (done: MochaDone): void {
        var createdPin: number;
        var config = conf({ serverDir: serverDir });
        certs.initializeServerCerts(config).
            then(function (): Q.Promise<number> {
            return certs.generateClientCert(conf({ serverDir: serverDir, suppressSetupMessage: true }));
        }).
            then(function (pin: number): void {
            should.assert(pin && pin >= 100000 && pin <= 999999, "pin should be a 6 digit number when client cert created");
            should.assert(fs.existsSync(path.join(clientCertsDir, "" + pin, "client.pfx")), "client.pfx should exist in pin directory after client cert created");
            createdPin = pin;
        }).
            then(function (): void {
            // 0.00002 in minutes is approx 1ms pin-expiration which is short enough it should always cause the new cert to be purged
            certs.purgeExpiredPinBasedClientCertsSync(conf({ serverDir: serverDir, pinTimeout: 0.00002 }));
        }).
            then(function (): void {
            should.assert(!fs.existsSync(path.join(clientCertsDir, "" + createdPin)), "client pin directory should no longer exist after purge with very quick timeout");
        }).
            then(function (): Q.Promise<number> {
            return certs.generateClientCert(conf({ serverDir: serverDir, suppressSetupMessage: true }));
        }).
        // create another PIN and purge with a 10 minute timeout
            then(function (pin: number): void {
            createdPin = pin;
            certs.purgeExpiredPinBasedClientCertsSync(conf({ serverDir: serverDir, pinTimeout: 10 }));
        }).
            then(function (): void {
            should.assert(fs.existsSync(path.join(clientCertsDir, "" + createdPin)), "client pin directory should still exist after purge with 10 min timeout");
        }).done(function (): void {
            done();
        }, done);
    });
    
    // Test that we can make a self signing CA certificate
    it("MakeSelfSigningCACert", function (done: MochaDone): void {
        certs.makeSelfSigningCACert(caKeyPath, caCertPath).
            then(function (): void {
            should.assert(fs.existsSync(caKeyPath), "ca-key should exist after makeSelfSigningCACert completes");
            should.assert(fs.existsSync(caCertPath), "ca-cert should exist after makeSelfSigningCACert completes");
        }).done(function (): void {
            done();
        }, done);
    });
    
    // Test that we can make a self signed certificate from the CA certificate
    it("MakeSelfSignedCert", function (done: MochaDone): void {
        var outKeyPath = path.join(__dirname, "out", "selfsigned-key.pem");
        var outCertPath = path.join(__dirname, "out", "selfsigned-cert.pem");

        certs.makeSelfSigningCACert(caKeyPath, caCertPath).
            then(function (): Q.Promise<void> {
            return certs.makeSelfSignedCert(caKeyPath, caCertPath, outKeyPath, outCertPath, {}, conf({ serverDir: path.join(__dirname, "out") }));
        }).
            then(function (): void {
            should.assert(fs.existsSync(outKeyPath), "key should exist after makeSelfSignedCert completes");
            should.assert(fs.existsSync(outCertPath), "cert should exist after makeSelfSignedCert completes");
        }).
            then(function (): Q.Promise<void> {
            return certs.verifyCert(caCertPath, outCertPath).
                then(function (output: { stdout: string }): void {
                should.assert(output.stdout.indexOf("OK") >= 0, "cert should be OK when verified against the CA cert");
            });
        }).
            then(function (): Q.Promise<void> {
            return certs.displayCert(outCertPath, ["dates"]).
                then(function (output: { stdout: string }): void {
                var notBefore = new Date(output.stdout.substring(output.stdout.indexOf("notBefore=") + 10, output.stdout.indexOf(os.EOL)));
                var notAfter = new Date(output.stdout.substring(output.stdout.indexOf("notAfter=") + 9, output.stdout.length - 1));
                var diffSeconds = (notAfter.getTime() - notBefore.getTime()) / 1000;
                should.assert(diffSeconds === (60 * 60 * 24 * 365 * 5), "Cert should expire in 5 years");
            });
        }).done(function (): void {
            done();
        }, done);
    });
});

function testServerCertsExist(): void {
    should.assert(fs.existsSync(path.join(certsDir, "server-key.pem")), "server-key should exist after initializeServerCerts completes");
    should.assert(fs.existsSync(path.join(certsDir, "server-cert.pem")), "server-cert should exist after initializeServerCerts completes");
    should.assert(fs.existsSync(path.join(certsDir, "ca-key.pem")), "ca-key should exist after initializeServerCerts completes");
    should.assert(fs.existsSync(path.join(certsDir, "ca-cert.pem")), "ca-cert should exist after initializeServerCerts completes");
}

function conf(data: any): RemoteBuildConf {
    // To silence the warning about lacking module configurations
    data.modules = {
        test: {}
    };
    nconf.overrides(data);
    return new RemoteBuildConf(nconf);
}