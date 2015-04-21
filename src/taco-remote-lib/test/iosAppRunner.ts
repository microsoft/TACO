/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */
/// <reference path="../../typings/mocha.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/should.d.ts" />
/// <reference path="../../typings/Q.d.ts" />
"use strict";
var should_module = require("should"); // Note not import: We don't want to refer to should_module, but we need the require to occur since it modifies the prototype of Object.

import runner = require ("../ios/iosAppRunner");
import net = require ("net");
import Q = require ("q");

interface IMockDebuggerProxy extends net.Server {
    protocolState?: number;
};

// Tests for lib/darwin/darwinAppRunner.js functionality
describe("Device functionality", function (): void {
    // Check that when the debugger behaves nicely, we do as well
    it("should complete the startup sequence when the debugger is well behaved", function (done: MochaDone): void {
        var port = 12345;
        var appPath = "/private/var/mobile/Applications/042F57CA-9717-4655-8349-532093FFCF44/BlankCordovaApp1.app";

        var encodedAppPath = "2F707269766174652F7661722F6D6F62696C652F4170706C69636174696F6E732F30343246353743412D393731372D343635352D383334392D3533323039334646434634342F426C616E6B436F72646F7661417070312E617070";
        encodedAppPath.should.equal(runner.encodePath(appPath));

        var mockDebuggerProxy: IMockDebuggerProxy = net.createServer(function (client: net.Socket): void {
            mockDebuggerProxy.close();
            client.on("data", function (data: Buffer): void {
                var dataString = data.toString();
                if (mockDebuggerProxy.protocolState % 2 === 1) {
                    // Every second message should be an acknowledgement of a send of ours
                    dataString[0].should.equal("+");
                    mockDebuggerProxy.protocolState++;
                    dataString = dataString.substring(1);
                    if (dataString === "") {
                        return;
                    }
                }

                dataString[0].should.equal("$");

                switch (mockDebuggerProxy.protocolState) {
                    case 0:
                        var expectedResponse = "A" + encodedAppPath.length + ",0," + encodedAppPath;
                        var checksum = 0;
                        for (var i = 0; i < expectedResponse.length; ++i) {
                            checksum += expectedResponse.charCodeAt(i);
                        };
                        checksum = checksum & 0xFF;
                        var checkstring = checksum.toString(16).toUpperCase();
                        if (checkstring.length === 1) {
                            checkstring = "0" + checkstring;
                        }

                        expectedResponse = "$" + expectedResponse + "#" + checkstring;
                        dataString.should.equal(expectedResponse);
                        mockDebuggerProxy.protocolState++;
                        client.write("+");
                        client.write("$OK#9A");
                        break;
                    case 2:
                        var expectedResponse = "$Hc0#DB";
                        dataString.should.equal(expectedResponse);
                        mockDebuggerProxy.protocolState++;
                        client.write("+");
                        client.write("$OK#9A");
                        break;
                    case 4:
                        var expectedResponse = "$c#63";
                        dataString.should.equal(expectedResponse);
                        mockDebuggerProxy.protocolState++;
                        client.write("+");
                        // Respond with empty output
                        client.write("$O#4F");
                        client.end();
                }
            });
        });
        mockDebuggerProxy.protocolState = 0;
        mockDebuggerProxy.on("error", done);

        mockDebuggerProxy.listen(port, function (): void {
            console.info("MockDebuggerProxy listening");
        });

        Q.timeout(runner.startAppViaDebugger(port, appPath), 1000)
            .done(function (): void {
            done();
        }, done);
    });

    // Check that when the debugger reports an error, we notice it
    it("should report an error if the debugger fails for some reason", function (done: MochaDone): void {
        var port = 12345;
        var appPath = "/private/var/mobile/Applications/042F57CA-9717-4655-8349-532093FFCF44/BlankCordovaApp1.app";

        var encodedAppPath = "2F707269766174652F7661722F6D6F62696C652F4170706C69636174696F6E732F30343246353743412D393731372D343635352D383334392D3533323039334646434634342F426C616E6B436F72646F7661417070312E617070";
        encodedAppPath.should.equal(runner.encodePath(appPath));

        var mockDebuggerProxy: IMockDebuggerProxy = net.createServer(function (client: net.Socket): void {
            mockDebuggerProxy.close();
            client.on("data", function (data: Buffer): void {
                var dataString = data.toString();
                if (mockDebuggerProxy.protocolState % 2 === 1) {
                    // Every second message should be an acknowledgement of a send of ours
                    dataString[0].should.equal("+");
                    mockDebuggerProxy.protocolState++;
                    dataString = dataString.substring(1);
                    if (dataString === "") {
                        return;
                    }
                }

                dataString[0].should.equal("$");

                switch (mockDebuggerProxy.protocolState) {
                    case 0:
                        var expectedResponse = "A" + encodedAppPath.length + ",0," + encodedAppPath;
                        var checksum = 0;
                        for (var i = 0; i < expectedResponse.length; ++i) {
                            checksum += expectedResponse.charCodeAt(i);
                        };
                        checksum = checksum & 0xFF;
                        var checkstring = checksum.toString(16).toUpperCase();
                        if (checkstring.length === 1) {
                            checkstring = "0" + checkstring;
                        }

                        expectedResponse = "$" + expectedResponse + "#" + checkstring;
                        dataString.should.equal(expectedResponse);
                        mockDebuggerProxy.protocolState++;
                        client.write("+");
                        client.write("$OK#9A");
                        break;
                    case 2:
                        var expectedResponse = "$Hc0#DB";
                        dataString.should.equal(expectedResponse);
                        mockDebuggerProxy.protocolState++;
                        client.write("+");
                        client.write("$OK#9A");
                        break;
                    case 4:
                        var expectedResponse = "$c#63";
                        dataString.should.equal(expectedResponse);
                        mockDebuggerProxy.protocolState++;
                        client.write("+");
                        client.write("$E23#AA"); // Report an error
                        client.end();
                }
            });
        });
        mockDebuggerProxy.protocolState = 0;
        mockDebuggerProxy.on("error", done);

        mockDebuggerProxy.listen(port, function (): void {
            console.info("MockDebuggerProxy listening");
        });

        Q.timeout(runner.startAppViaDebugger(port, appPath), 1000).done(function (): void {
            done(new Error("Starting the app should have failed!"));
        }, function (err: any): void {
                err.should.equal("UnableToLaunchApp");
                done();
            });
    });
});
