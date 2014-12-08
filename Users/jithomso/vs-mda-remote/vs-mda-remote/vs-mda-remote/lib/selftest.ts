/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import fs = require('fs');
import fstream = require('fstream');
import https = require('https');
import nconf = require('nconf');
import os = require('os');
import path = require('path');
import request = require('request');
import Q = require('q');
import tar = require('tar');
import zlib = require('zlib');

import OSSpecifics = require('./OSSpecifics');

function selfTest() {
    nconf.argv();
    nconf.defaults({
        'server': 'https://' + os.hostname() + ':3000',
        'serverDir': OSSpecifics.osSpecifics.defaults({}).serverDir,
        'wait': true,
        'download': false,
        'cordovaApp': path.resolve(__dirname, '../examples/cordovaApp/helloCordova'),
        'tping': 5000,
        'maxping': 10,
        'vcordova': require('cordova/package.json').version,
        'cfg': 'release',
        'suppressVisualStudioMessage': true
    });

    var serverUrl = nconf.get('server');
    var serverDir = path.resolve(process.cwd(), nconf.get('serverDir'));

    initialize(serverUrl, serverDir).then(runTest);
}

var selftestDownloadDir: string;
var httpsAgent: https.Agent;

function runTest() {
    var serverUrl = nconf.get('server');
    var tgzFile = nconf.get('tgz');
    var cordovaAppDir = nconf.get('cordovaApp');
    var wait = nconf.get('wait');
    var download = nconf.get('download');
    var pingInterval = nconf.get('tping');
    var maxPings = nconf.get('maxping');
    var vcordova = nconf.get('vcordova');
    var cfg = nconf.get('cfg');
    var buildOptions = nconf.get('device') ? '--device' : '--emulator';

    var tgzProducingStream = null;
    if (tgzFile) {
        tgzProducingStream = fs.createReadStream(tgzFile);
    } else if (cordovaAppDir) {
        var cordovaAppDirReader = new fstream.Reader({ path: cordovaAppDir, type: 'Directory', mode: 777, filter: filterForTar });
        tgzProducingStream = cordovaAppDirReader.pipe(tar.Pack()).pipe(zlib.createGzip());
    }

    var buildUrl = serverUrl + '/build/tasks?vcordova=' + vcordova + '&cfg=' + cfg + '&command=build&options=' + buildOptions;
    console.info('serverUrl: ' + serverUrl);
    console.info('buildUrl: ' + buildUrl);
    tgzProducingStream.pipe(request.post(requestOptions(buildUrl), function (error, response, body) {
        console.info('Response statusCode: ' + response.statusCode);
        console.info(response.headers);
        console.info('Response: ' + body);

        if (wait === true || download === true) {
            var i = 0;
            var buildingUrl = response.headers['content-location'];
            console.info('buildingUrl: ' + buildUrl);

            var ping = setInterval(function () {
                i++;
                request.get(requestOptions(buildingUrl), function (error, response, body) {
                    if (error) {
                        console.info('[' + i + '] Response: ' + response.url + ' ' + error);
                        clearInterval(ping);
                        return;
                    }
                    console.info('[' + i + '] Response: ' + response.url + ' ' + body);
                    var build = JSON.parse(body);
                    if (build['status'] === 'error' || build['status'] === 'downloaded' || build['status'] === 'deleted' || build['status'] === 'invalid') {
                        clearInterval(ping);
                    } else if (build['status'] === 'complete') {
                        console.info('Build completed on server');
                        if (download) {
                            var downloadUrl = serverUrl + '/build/' + build['buildNumber'] + '/download';
                            var buildNumber = build['buildNumber'];
                            var downloadFile = path.join(selftestDownloadDir, 'build_' + buildNumber + '_download.zip');
                            console.info('Downloading completed build from ' + downloadUrl + ' to ' + downloadFile + '...');
                            request(requestOptions(downloadUrl)).pipe(fs.createWriteStream(downloadFile));
                            console.info('Downloaded ' + downloadFile);
                        }
                        clearInterval(ping);
                    } else if (i > maxPings) {
                        console.info('Exceeded max # of pings: ' + maxPings);
                        clearInterval(ping);
                    }
                })
            }, pingInterval);
        }
    }));
}

function initialize(serverUrl: string, serverDir: string) : Q.Promise<void>{
    selftestDownloadDir = path.join(serverDir, 'selftest');
    require('../lib/util').createDirectoryIfNecessary(selftestDownloadDir);

    if (serverUrl.indexOf('https:') === 0) {
        console.info('Initializing self test for https');
        return OSSpecifics.osSpecifics.generateClientCert(nconf).
            then(function (pin) {
                console.info('downloading cert for pin %d', pin);
                return downloadClientCert(serverUrl, serverDir, pin);
            }).
            then(function (pfxPath) {
                console.info('pfxPath: %s', pfxPath);
                //httpsAgentOptions = {strictSSL: true, pfx: fs.readFileSync(path.join(selftestDownloadDir, 'selftest-client.pfx'))};
                httpsAgent = new https.Agent({ strictSSL: true, pfx: fs.readFileSync(pfxPath) });
            });
    }
    return Q<void>(void 0);
}

function downloadClientCert(serverUrl: string, serverDir: string, pin: number) : Q.Promise<string>{
    var deferred = Q.defer<string>();
    var downloadPfxPath = path.join(selftestDownloadDir, 'selftest-client.pfx');
    console.info('Downloading client cert for selftest from %s to %s', serverUrl + '/certs/' + pin, downloadPfxPath);
    var req = request.get({ url: serverUrl + '/certs/' + pin, strictSSL: false });
    req.pipe(fs.createWriteStream(downloadPfxPath));
    req.on('end', function () {
        deferred.resolve(downloadPfxPath);
    });
    return deferred.promise;
}

// Archive up what is needed for an ios build and put current process user id on entries
function filterForTar(reader: fstream.Reader, props: { uid: number }) : boolean{
    if (reader.parent !== null) {
        if (reader.parent.basename.match(/^platforms$/)) {
            return false;
        }
    }
    if (process.platform !== 'win32') {
        props.uid = process.getuid();
    }
    return true;
}

function requestOptions(url: string ) {
    return { url: url, agent: httpsAgent };
}

export = selfTest;