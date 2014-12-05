/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import request = require('request');
import fs = require('fs');
import fstream = require('fstream');
import tar = require('tar');
import zlib = require('zlib');
import Q = require('q');
import path = require('path');
import res = require('./resources');
import https = require('https');
import util = require('./util');
import AdmZip = require('adm-zip');
import BuildSettings = require('./BuildSettings');


var pingInterval: number = 5000;
var incrementalBuildNumber: number = 0;





export function build(settings: BuildSettings) : Q.IPromise<any> {
    var outputBuildDir: string = settings.platformConfigurationBldDir;
    var outputBinDir: string = settings.platformConfigurationBinDir;
    var buildInfoFilePath = path.join(outputBuildDir, 'buildInfo.json');

    if (isValidBuildServerUrl(settings.buildServerUrl) === false) {
        throw new Error(res.getString('InvalidRemoteBuildUrl', settings.buildServerUrl, 1));
    }

    var promise = checkForBuildOnServer(settings, buildInfoFilePath)
        .then(function (canDoIncremental) {
            settings.isIncrementalBuild = canDoIncremental;
            console.info(res.getString('IncrementalBuild', settings.isIncrementalBuild));

            var iosJsonFile = path.join(settings.cordovaAppDir, 'plugins', 'remote_ios.json');
            if (fs.existsSync(iosJsonFile)) {
                fs.unlinkSync(iosJsonFile);
            }
        })
        .then(function () {
            return appAsTgzStream(settings);
        })
        .then(function (tgz) {
            return submitBuildRequestToServer(settings, tgz);
        })
        .then(function (buildingUrl) {
            return pollForBuildComplete(settings, buildingUrl, pingInterval, 0);
        })
        .then(function (result) {
            if (result.buildNumber) {
                return logBuildOutput(result, settings);
            } else if (result.buildInfo) {
                return logBuildOutput(result.buildInfo, settings).then(function () {
                    // I don't know why we are doing this...
                    return throwErrorAfterDelay(1000, result);
                });
            }
        })
        .then(function (buildInfo) {
            return downloadRemotePluginFile(buildInfo, settings, path.join(settings.cordovaAppDir, 'plugins'));
        })
        .then(function (buildInfo) {
            util.createDirectoryIfNecessary(outputBuildDir);
            fs.writeFileSync(path.join(outputBuildDir, 'buildInfo.json'), JSON.stringify(buildInfo));
            return buildInfo;
        });
    // If build is for a device we will download the build as a zip with an ipa file and plist file in it
    if (isDeviceBuild(settings)) {
        var resultingBuildInfo;
        promise = promise
            .then(function (buildInfo) {
                resultingBuildInfo = buildInfo;
                return downloadBuild(buildInfo, settings, outputBuildDir);
            })
            .then(function (zipFile) {
                return unzipBuildFiles(zipFile, outputBinDir);
            })
            .then(function () {
                return resultingBuildInfo;
            });
    }
    return promise;
}

export function isValidBuildServerUrl(serverUrl: string): boolean {
    return (serverUrl.indexOf('http://') === 0 || serverUrl.indexOf('https://') === 0);
}

export function httpOptions(url: string, settings: BuildSettings): request.Options {
    return {
        url: url,
        headers: { 'Accept-Language': settings.language },
        agent: settings.agent()
    };
}

function checkForBuildOnServer(settings: BuildSettings, buildInfoFilePath: string): Q.IPromise<boolean> {
    var deferred = Q.defer();

    if (!fs.existsSync(buildInfoFilePath)) {
        deferred.resolve(false);
        return deferred.promise;
    }

    var buildInfo = require(buildInfoFilePath);
    if (!buildInfo) {
        deferred.resolve(false);
        return deferred.promise;
    }

    var buildNumber: number = buildInfo.buildNumber;

    var serverUrl = settings.buildServerUrl;
    var buildUrl = serverUrl + '/build/' + buildNumber;

    request.get(httpOptions(buildUrl, settings), function (error, response, body) {
        if (error) {
            deferred.reject(errorFromRemoteBuildServer(serverUrl, error, 'RemoteBuildERror'));
        } else if (response.statusCode === 200) {
            incrementalBuildNumber = buildNumber;
            deferred.resolve(true);
        } else {
            deferred.resolve(false);
        }
    });

    return deferred.promise;
}

function errorFromRemoteBuildServer(serverUrl: string, requestError, fallbackErrorId: string): Error {
    if (requestError.toString().indexOf('CERT_') !== -1) {
        return new Error(res.getString('InvalidRemoteBuildClientCert'));
    } else if (serverUrl.indexOf('https://') === 0 && requestError.code === 'ECONNRESET') {
        return new Error(res.getString('RemoteBuildSslConnectionReset', serverUrl));
    } else if (serverUrl.indexOf('http://') === 0 && requestError.code === 'ECONNRESET') {
        return new Error(res.getString('RemoteBuildNonSslConnectionReset', serverUrl));
    } else if (requestError.code === 'ENOTFOUND') {
        // Host unreachable regardless of whether http or https
        return new Error(res.getString('RemoteBuildHostNotFound', serverUrl));
    } else if (requestError.code === 'ECONNREFUSED') {
        // Host reachable but connection not established (e.g. Server not running)
        return new Error(res.getString('RemoteBuildNoConnection', serverUrl));
    }
    return new Error(res.getString(fallbackErrorId, serverUrl, requestError));
}

function appAsTgzStream(settings: BuildSettings): zlib.Gzip {
    var cordovaAppDir = settings.cordovaAppDir;
    var _filterForTar = function (reader, props) {
        return filterForTar(settings, reader, props);
    };

    if (fs.existsSync(settings.changeListFile)) {
        util.copyFileContentsSync(settings.changeListFile, path.join(cordovaAppDir, 'changeList.json'));
    }

    var cordovaAppDirReader = new fstream.Reader({ path: cordovaAppDir, type: 'Directory', mode: 777, filter: _filterForTar });
    var tgzProducingStream = cordovaAppDirReader.pipe(tar.Pack()).pipe(zlib.createGzip());
    return tgzProducingStream;
}

var resSlashIcons = path.join('res', 'icons');
var resSlashScreens = path.join('res', 'screens');
var resSlashCert = path.join('res', 'cert');

// We will only want to archive up what is needed for an ios build
function filterForTar(settings: BuildSettings, reader: fstream.Reader, props) {
    if (reader.parent !== null) {
        var appRelPath = path.relative(settings.cordovaAppDir, reader.path);
        if (appRelPath) {
            if (reader.parent.basename.match(/^merges$/) && appRelPath.indexOf('merges') === 0) {
                if (reader.basename !== 'ios') {
                    return false;
                }
            }
            if (reader.parent.basename.match(/^platforms$/) && appRelPath.indexOf('platforms') === 0) {
                return false;
            }
            if (reader.parent.basename.match(/^icons$/) && appRelPath.indexOf(resSlashIcons) === 0) {
                if (reader.basename !== 'ios') {
                    return false;
                }
            }
            if (reader.parent.basename.match(/^screens$/) && appRelPath.indexOf(resSlashScreens) === 0) {
                if (reader.basename !== 'ios') {
                    return false
                }
            }
            if (reader.parent.basename.match(/^cert$/) && appRelPath.indexOf(resSlashCert) === 0) {
                if (reader.basename !== 'ios') {
                    return false;
                }
            }
        }
    }

    if (settings.isIncrementalBuild && settings.changeList && appRelPath) {
        if (appRelPath == 'www') {
            return true;
        }

        var stat = fs.statSync(reader.path);

        // Files in the project directory don't have the www\, so strip that off
        if (appRelPath.indexOf('www' + path.sep) === 0) {
            appRelPath = appRelPath.substr(4);
        }

        if (stat.isDirectory()) {
            if (appRelPath === 'plugins' &&
                settings.changeList.addedPlugins.length > 0) {
                return true;
            }

            if (appRelPath.indexOf('plugins' + path.sep) === 0) {
                var plugin = appRelPath.substr(8);

                if (plugin.indexOf(path.sep) > 0) {
                    plugin = plugin.substr(0, plugin.indexOf(path.sep));
                }

                for (var i = 0; i < settings.changeList.addedPlugins.length; i++) {
                    var addedPlugin = settings.changeList.addedPlugins[i];
                    if (addedPlugin === plugin ||
                        addedPlugin.indexOf(plugin + '@') === 0) {
                        return true;
                    }
                }
            }

            for (var i = 0; i < settings.changeList.changedFilesIos.length; i++) {
                var changedFile = settings.changeList.changedFilesIos[i];
                if (changedFile.indexOf(appRelPath + path.sep) == 0) {
                    return true;
                }
            }

            return false;
        }

        if (appRelPath === 'changeList.json') {
            return true;
        }

        if (appRelPath.indexOf('plugins' + path.sep) === 0) {
            var plugin = appRelPath.substr(8);
            if (plugin) {
                plugin = plugin.substr(0, plugin.indexOf(path.sep));
            }

            for (var i = 0; i < settings.changeList.addedPlugins.length; i++) {
                var addedPlugin = settings.changeList.addedPlugins[i];
                if (addedPlugin === plugin ||
                    addedPlugin.indexOf(plugin + '@') === 0) {
                    return true;
                }
            }
        }

        if (settings.changeList.changedFilesIos && settings.changeList.changedFilesIos.indexOf(appRelPath) < 0) {
            return false;
        }
    }

    return true;
}

function submitBuildRequestToServer(settings: BuildSettings, appAsTgzStream: zlib.Gzip): Q.IPromise<string> {
    var serverUrl: string = settings.buildServerUrl;
    var vcordova: string = settings.cordovaVersion;
    var cfg: string = settings.configuration ? settings.configuration.toLowerCase() : 'release';

    var deferred = Q.defer();
    var buildUrl = serverUrl + '/build/tasks?command=build&vcordova=' + vcordova + '&cfg=' + cfg;
    if (isDeviceBuild(settings)) {
        buildUrl += '&options=--device';
    }
    if (settings.isIncrementalBuild) {
        buildUrl += '&buildNumber=' + incrementalBuildNumber;
    }
    console.info(res.getString('SubmittingRemoteBuild', buildUrl));

    appAsTgzStream.on('error', function (error) {
        deferred.reject(new Error(res.getString('ErrorUploadingRemoteBuild', serverUrl, error)));
    });
    appAsTgzStream.pipe(request.post(httpOptions(buildUrl, settings), function (error, response, body) {
        if (error) {
            deferred.reject(errorFromRemoteBuildServer(serverUrl, error, 'ErrorUploadingRemoteBuild'));
        } else if (response.statusCode === 400) {
            // Build server sends back http 400 for invalid submissions with response like this. We will fail the build with a formatted message.
            // {"status": "Invalid build submission", "errors": ["The requested cordova version 3.5.0-0.2.4 is not supported by this build manager. Installed cordova version is 3.4.1-0.1.0"]}
            var errorsJson = JSON.parse(body);
            deferred.reject(new Error(errorsJson.status + ': ' + errorsJson.errors.toString()));
        } else if (response.statusCode === 202) {
            // Expect http 202 for a valid submission which is "Accepted" with a content-location to the Url to check for build status
            console.info(res.getString('NewRemoteBuildInfo', body));
            var buildInfo = JSON.parse(body);
            deferred.resolve(response.headers['content-location']);
        } else {
            deferred.reject(new Error(body));
        }
    }));

    return deferred.promise;
}

function isDeviceBuild(settings: BuildSettings): boolean {
    return settings.buildTarget && settings.buildTarget.toLowerCase().match(/device/)!= null;
}

/*
Status progression: uploaded -> extracted -> building -> [complete|invalid|error] -> downloaded [if a device targeted build]
*/
function pollForBuildComplete(settings: BuildSettings, buildingUrl: string, interval: number, attempts: number) {
    var thisAttempt = attempts + 1;
    console.info(res.getString('CheckingRemoteBuildStatus', (new Date()).toLocaleTimeString(), buildingUrl, thisAttempt));

    return util.promiseForHttpGet(httpOptions(buildingUrl, settings))
        .then(function (responseAndBody) {
            if (responseAndBody.response.statusCode !== 200) {
                throw new Error('Http ' + responseAndBody.response.statusCode + ': ' + responseAndBody.body);
            }
            var buildInfo = JSON.parse(responseAndBody.body);
            console.info(buildInfo['status'] + ' - ' + buildInfo['message']);
            if (buildInfo['status'] === 'complete') {
                return buildInfo;
            } else if (buildInfo['status'] === 'invalid') {
                throw new Error(res.getString('InvalidRemoteBuild', buildInfo['message']));
            } else if (buildInfo['status'] === 'error') {
                var err: any = new Error(res.getString('RemoteBuildError', buildInfo['message']));
                err.buildInfo = buildInfo;
                return err;
            }
            return Q.delay(interval).then(function () {
                return pollForBuildComplete(settings, buildingUrl, interval, thisAttempt);
            });
        });
}

function logBuildOutput(buildInfo, settings: BuildSettings) {
    var serverUrl = settings.buildServerUrl;
    var deferred = Q.defer();
    var buildNumber = buildInfo['buildNumber'];
    var downloadUrl = serverUrl + '/build/tasks/' + buildNumber + '/log';
    console.info(res.getString('RemoteBuildLogFollows'));
    request(httpOptions(downloadUrl, settings)).on('end', function () {
        deferred.resolve(buildInfo);
    }).pipe(process.stdout);
    return deferred.promise;
}

function throwErrorAfterDelay(delay, error): Q.IPromise<any> {
    return Q.delay(delay).then(function () {
        throw error;
    });
}

function downloadRemotePluginFile(buildInfo, settings: BuildSettings, toDir: String): Q.IPromise<any> {

    var serverUrl = settings.buildServerUrl;
    var deferred = Q.defer();
    var buildNumber = buildInfo['buildNumber'];
    var downloadUrl = serverUrl + '/files/' + buildNumber + '/cordovaApp/plugins/ios.json';

    request(httpOptions(downloadUrl, settings)).on('end', function () {
        deferred.resolve(buildInfo);
    }).pipe(fs.createWriteStream(path.join(toDir, 'remote_ios.json')));

    return deferred.promise;
}

function downloadBuild(buildInfo, settings: BuildSettings, toDir: string) : Q.IPromise<string>{
    var serverUrl = settings.buildServerUrl;
    util.createDirectoryIfNecessary(toDir);
    var deferred = Q.defer();

    var buildNumber = buildInfo.buildNumber;
    var downloadUrl = serverUrl + '/build/' + buildNumber + '/download';

    console.info(res.getString('DownloadingRemoteBuild', downloadUrl, toDir));
    var zipFile = path.join(toDir, buildNumber + '.zip');
    var outZip = fs.createWriteStream(zipFile);
    outZip.on('error', function (error) {
        deferred.reject(new Error(res.getString('ErrorDownloadingRemoteBuild', toDir, error)));
    });
    outZip.on('close', function () {
        console.info(res.getString('DownloadedRemoteBuild', toDir));
        deferred.resolve(zipFile);
    });
    request(httpOptions(downloadUrl, settings)).pipe(outZip);

    return deferred.promise;
}

function unzipBuildFiles(zipFile: string, toDir: string) {
    console.info(res.getString('ExtractingRemoteBuild', toDir));
    util.createDirectoryIfNecessary(toDir);
    var deferred = Q.defer();

    try {
        var zip = new AdmZip(zipFile);
        zip.extractAllTo(toDir, true);
        console.info(res.getString('DoneExtractingRemoteBuild', toDir));
        fs.unlink(zipFile, function (err) {
            if (err) {
                console.info(res.getString('FailedToDeleteRemoteZip', zipFile));
            }
            deferred.resolve({});
        });
    } catch (error) {
        deferred.reject(new Error(res.getString('ErrorDownloadingRemoteBuild', toDir, error)));
    }
    return deferred.promise;
}