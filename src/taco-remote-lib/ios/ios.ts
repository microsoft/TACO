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
/// <reference path="../../typings/zip-stream.d.ts" />
/// <reference path="../../typings/express.d.ts" />
/// <reference path="../ITargetPlatform.d.ts" />

"use strict";

import child_process = require ("child_process");
import fs = require ("fs");
import net = require ("net");
import path = require ("path");
import util = require ("util");
import Packer = require ("zip-stream");

import iosAppRunner = require ("./iosAppRunnerHelper");
import resources = require ("../resources/resourceManager");
import utils = require ("taco-utils");

import BuildInfo = utils.BuildInfo;
import Logger = utils.Logger;
import ProcessLogger = utils.ProcessLogger;
import UtilHelper = utils.UtilHelper;

class IOSAgent implements ITargetPlatform {
    private nativeDebugProxyPort: number;
    private webProxyInstance: child_process.ChildProcess = null;
    private webDebugProxyDevicePort: number;
    private webDebugProxyPortMin: number;
    private webDebugProxyPortMax: number;
    private appLaunchStepTimeout: number;

    /**
     * Initialize iOS specific information from the configuration.
     * 
     * @param {IReadOnlyConf} config A dictionary of user-provided parameters
     */
    constructor(config: { get(key: string): any; }) {
        this.nativeDebugProxyPort = config.get("nativeDebugProxyPort") || 3001;
        this.webDebugProxyDevicePort = config.get("webDebugProxyDevicePort") || 9221;
        this.webDebugProxyPortMin = config.get("webDebugProxyPortMin") || 9222;
        this.webDebugProxyPortMax = config.get("webDebugProxyPortMax") || 9322;

        this.appLaunchStepTimeout = config.get("appLaunchStepTimeout") || 10000;

        if (utils.ArgsHelper.argToBool(config.get("allowsEmulate"))) {
            process.env["PATH"] = path.resolve(__dirname, path.join("..", "node_modules", ".bin")) + ":" + process.env["PATH"];
            child_process.exec("which ios-sim", function (err: Error, stdout: Buffer, stderr: Buffer): void {
                if (err) {
                    Logger.logError(resources.getString("IOSSimNotFound"));
                }
            });
        }
    }

    public canServiceRequest(buildInfo: BuildInfo): boolean {
        return buildInfo.buildPlatform.toLowerCase() === "ios";
    }

    /**
     * Launch an app on an iOS device attached to the build server
     * 
     * @param {BuildInfo} buildInfo Information specifying the build
     * @param {express.Request} req The HTTP request being serviced
     * @param {express.Response} res The response to the HTTP request, which must be sent by this function
     */
    public runOnDevice(buildInfo: BuildInfo, req: Express.Request, res: Express.Response): void {
        if (!fs.existsSync(buildInfo.appDir)) {
            res.status(404).send(resources.getStringForLanguage(req, "BuildNotFound", req.params.id));
            return;
        }

        var proxyPort: number = this.nativeDebugProxyPort;
        var appLaunchStepTimeout = this.appLaunchStepTimeout;
        var cfg: utils.CordovaConfig = utils.CordovaConfig.getCordovaConfig(buildInfo.appDir);
        iosAppRunner.startDebugProxy(proxyPort)
            .then(function (nativeProxyProcess: child_process.ChildProcess): Q.Promise<net.Socket> {
            return iosAppRunner.startApp(cfg.id(), proxyPort, appLaunchStepTimeout);
        }).then(function (success: net.Socket): void {
            res.status(200).send(buildInfo.localize(req, resources));
        }, function (failure: any): void {
            if (failure.message) {
                var response = resources.getStringForLanguage(req, failure.message);
                if (!response) {
                    response = resources.getStringForLanguage(req, "UnableToLaunchAppWithReason", failure.message);
                }
                res.status(404).send(response);
            } else if (typeof failure === "string") {
                res.status(404).send(resources.getStringForLanguage(req, failure));
            } else {
                res.status(404).send(resources.getStringForLanguage(req, "UnableToLaunchAppWithReason", failure.toString()));
            }
        });
    }

    public downloadBuild(buildInfo: BuildInfo, req: Express.Request, res: Express.Response, callback: (err: any) => void): void {
        var iosOutputDir: string = path.join(buildInfo.appDir, "platforms", "ios", "build", "device");
        var pathToPlistFile: string = path.join(iosOutputDir, buildInfo["appName"] + ".plist");
        var pathToIpaFile: string = path.join(iosOutputDir, buildInfo["appName"] + ".ipa");
        if (!fs.existsSync(pathToPlistFile) || !fs.existsSync(pathToIpaFile)) {
            var msg: string = resources.getString("DownloadInvalid", pathToPlistFile, pathToIpaFile);
            Logger.log(msg);
            res.status(404).send(resources.getStringForLanguage(req, "DownloadInvalid", pathToPlistFile, pathToIpaFile));
            callback(msg);
            return;
        }

        var archive: Packer = new Packer();
        archive.on("error", function (err: Error): void {
            Logger.logError(resources.getString("ArchivePackError", err.message));
            callback(err);
            res.status(404).send(resources.getStringForLanguage(req, "ArchivePackError", err.message));
        });
        res.set({ "Content-Type": "application/zip" });
        archive.pipe(res);
        archive.entry(fs.createReadStream(pathToPlistFile), { name: buildInfo["appName"] + ".plist" },
            function (pListEntryError: Error, pListEntry: any): void {
            if (pListEntryError) {
                Logger.logError(resources.getString("ArchivePackError", pListEntryError.message));
                callback(pListEntryError);
                res.status(404).send(resources.getStringForLanguage(req, "ArchivePackError", pListEntryError.message));
                return;
            }

            archive.entry(fs.createReadStream(pathToIpaFile), { name: buildInfo["appName"] + ".ipa" },
                function (ipaEntryError: Error, ipaEntry: any): void {
                if (ipaEntryError) {
                    Logger.logError(resources.getString("ArchivePackError", ipaEntryError.message));
                    callback(ipaEntryError);
                    res.status(404).send(resources.getStringForLanguage(req, "ArchivePackError", ipaEntryError.message));
                    return;
                }

                archive.finalize();
                callback(null);
            });
        });
    }

    public emulateBuild(buildInfo: utils.BuildInfo, req: Express.Request, res: Express.Response): void {
        if (!fs.existsSync(buildInfo.appDir)) {
            res.status(404).send(resources.getStringForLanguage(req, "BuildNotFound", req.params.id));
            return;
        }

        if (!req.query.target) {
            // Emulate the iPhone 5 if not otherwise specified by the client.
            req.query.target = "iphone 5";
        }

        var cfg: utils.CordovaConfig = utils.CordovaConfig.getCordovaConfig(buildInfo.appDir);

        var emulateProcess: child_process.ChildProcess = child_process.fork(path.join(__dirname, "iosEmulateHelper.js"), [], { silent: true });
        var emulateLogger: ProcessLogger = new ProcessLogger();
        emulateLogger.begin(buildInfo.buildDir, "emulate.log", buildInfo.buildLang, emulateProcess);
        emulateProcess.send({ appDir: buildInfo.appDir, appName: cfg.id(), target: req.query.target, version: req.query.iOSVersion }, null);

        emulateProcess.on("message", function (result: { status: string; messageId: string; messageArgs?: any }): void {
            buildInfo.updateStatus(result.status, result.messageId, result.messageArgs);
            if (result.status !== utils.BuildInfo.ERROR) {
                res.status(200).send(buildInfo.localize(req, resources));
            } else {
                res.status(404).send(buildInfo.localize(req, resources));
            }

            emulateProcess.kill();
            emulateLogger.end();
        });
    }

    public deployBuildToDevice(buildInfo: utils.BuildInfo, req: Express.Request, res: Express.Response): void {
        var pathToIpaFile: string = path.join(buildInfo.appDir, "platforms", "ios", "build", "device", buildInfo["appName"] + ".ipa");
        if (!fs.existsSync(pathToIpaFile)) {
            res.status(404).send(resources.getStringForLanguage(req, "BuildNotFound", req.params.id));
            return;
        }

        var ideviceinstaller: child_process.ChildProcess = child_process.spawn("ideviceinstaller", ["-i", pathToIpaFile]);
        var stdout: string = "";
        var stderr: string = "";
        var errorMessage: string;
        ideviceinstaller.stdout.on("data", function (data: Buffer): void {
            var dataStr: String = data.toString();
            if (dataStr.indexOf("ApplicationVerificationFailed") !== -1) {
                errorMessage = resources.getStringForLanguage(req, "ProvisioningFailed");
            }

            stdout += dataStr;
        });
        ideviceinstaller.stderr.on("data", function (data: Buffer): void {
            var dataStr: string = data.toString();
            if (!errorMessage) {
                if (dataStr.indexOf("No iOS device found, is it plugged in?") > -1) {
                    errorMessage = resources.getStringForLanguage(req, "InstallFailNoDevice");
                } else {
                    // Do nothing: the error will be reported in the stderr of the response
                }
            }

            stderr += dataStr;
        });
        ideviceinstaller.on("close", function (code: number): void {
            if (errorMessage) {
                res.status(404).send(errorMessage);
            } else if (code !== 0) {
                res.status(404).json({ stdout: stdout, stderr: stderr, code: code });
            } else {
                buildInfo.updateStatus(utils.BuildInfo.INSTALLED, "InstallSuccess");
                res.status(200).json(buildInfo.localize(req, resources));
            }
        });

        ideviceinstaller.on("error", function (err: any): void {
            res.status(500);
            if (err.code === "ENOENT") {
                res.send(resources.getStringForLanguage(req, "IDeviceInstallerNotFound"));
            } else {
                res.send(err);
            }
        });
    }

    public debugBuild(buildInfo: utils.BuildInfo, req: Express.Request, res: Express.Response): void {
        if (this.webProxyInstance) {
            this.webProxyInstance.kill();
            this.webProxyInstance = null;
        }

        var portRange: string = util.format("null:%d,:%d-%d", this.webDebugProxyDevicePort, this.webDebugProxyPortMin, this.webDebugProxyPortMax);
        try {
            this.webProxyInstance = child_process.spawn("ios_webkit_debug_proxy", ["-c", portRange]);
        } catch (e) {
            res.status(404).send(resources.getStringForLanguage(req, "UnableToDebug"));
            return;
        }

        buildInfo["webDebugProxyPort"] = this.webDebugProxyDevicePort;
        buildInfo.updateStatus(utils.BuildInfo.DEBUGGING, "DebugSuccess");
        res.status(200).send(buildInfo.localize(req, resources));
    }

    public createBuildProcess(): child_process.ChildProcess {
        return child_process.fork(path.join(__dirname, "iosBuild.js"), [], { silent: true });
    }
}

export = IOSAgent;
