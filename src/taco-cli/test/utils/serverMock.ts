/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/zip-stream.d.ts" />
import fs = require ("fs");
import http = require ("http");
import https = require ("https");
import path = require("path");
import packer = require("zip-stream");

class ServerMock {
    /*
     * Create a https server using the certificates in test/resources/certs/
     */
    public static createSecureTestServer(): https.Server {
        var testCertsFolder = path.resolve(__dirname, "..", "resources", "certs");
        var sslSettings: https.ServerOptions = {
            key: fs.readFileSync(path.join(testCertsFolder, "server-key.pem")),
            cert: fs.readFileSync(path.join(testCertsFolder, "server-cert.pem")),
            ca: fs.readFileSync(path.join(testCertsFolder, "ca-cert.pem")),
            requestCert: true,
            rejectUnauthorized: false
        };

        return https.createServer(sslSettings);
    }

    /*
     * Create a simple state machine that expects a particular sequence of HTTP requests, and errors out if that expectation is not matched
     */
    public static generateServerFunction(onErr: (err: Error) => void, sequence: { expectedUrl: string; statusCode: number; head: any; response: any; waitForPayload?: boolean; responseDelay?: number; sendMockFile?: boolean }[]):
        (request: http.ServerRequest, response: http.ServerResponse) => void {
        var sequenceIndex = 0;
        return function (request: http.ServerRequest, response: http.ServerResponse): void {
            if (sequenceIndex < sequence.length) {
                var data = sequence[sequenceIndex];
                ++sequenceIndex;
                if (request.url !== data.expectedUrl) {
                    onErr(new Error("Expected request to " + data.expectedUrl + " got " + request.url));
                } else {
                    var sendResponse = function (): void {
                        setTimeout(() => {
                            response.writeHead(data.statusCode, data.head);
                            response.write(data.response);

                            if (data.sendMockFile) {
                                var archive = new packer();
                                archive.pipe(response);
                                archive.finalize();
                            }
                            response.end();
                        }, data.responseDelay || 0);
                    };

                    if (data.waitForPayload) {
                        request.on("data", function (chunk: any): void {
                            // ignore it
                        });
                        request.on("end", sendResponse);
                    } else {
                        sendResponse();
                    }
                }
            } else {
                onErr(new Error("Unexpected query " + request.url));
            }
        };
    }
}

export = ServerMock;