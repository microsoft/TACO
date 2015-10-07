/// <reference path="../../../typings/node.d.ts" />
import fs = require ("fs");
import http = require ("http");
import https = require ("https");
import path = require("path");

import IRemoteServerSequence = require ("./remoteServerSequence");
import IHttpServerFunction = require ("./httpServerFunction");

class ServerMock {

    /*
     * Create a https server using the certificates in test/resources/certs/
     */
    public static createSecureTestServer(): https.Server {
        var testCertsFolder: string = path.resolve(__dirname, "..", "resources", "certs");
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
    public static generateServerFunction(onErr: (err: Error) => void, sequence: IRemoteServerSequence[]): IHttpServerFunction {
        var sequenceIndex: number = 0;
        return function (request: http.ServerRequest, response: http.ServerResponse): void {
            if (sequenceIndex < sequence.length) {
                var data: any = sequence[sequenceIndex];
                ++sequenceIndex;
                if (request.url !== data.expectedUrl) {
                    onErr(new Error("Expected request to " + data.expectedUrl + " got " + request.url));
                } else {
                    var sendResponse: () => void = function (): void {
                        setTimeout(() => {
                            response.writeHead(data.statusCode, data.head);
                            if (data.fileToSend) {
                                var reader: fs.ReadStream = fs.createReadStream(data.fileToSend);
                                reader.pipe(response);
                                reader.on("end", function (): void {
                                    response.end();
                                });
                            } else {
                                response.write(data.response);
                                response.end();
                            }
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
