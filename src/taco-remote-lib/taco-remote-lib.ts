/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/taco-utils.d.ts" />
/// <reference path="../typings/express.d.ts" />
/// <reference path="../typings/semver.d.ts" />
/// <reference path="./IPlatform.d.ts" />
"use strict";

import child_process = require ("child_process");
import express = require ("express");
import fs = require ("fs");
import net = require ("net");
import path = require ("path");
import semver = require ("semver");
import utils = require ("taco-utils");
import BuildInfo = utils.BuildInfo;
import ProcessLogger = utils.ProcessLogger;
import resources = utils.ResourcesManager;

import IOSAgent = require ("./ios/ios");
import IPlatform = require ("./IPlatform.d");

module TacoRemoteLib {
    var language: string;
    var platforms: IPlatform[];
    var initialized = false;

    export interface IReadOnlyConf {
        get(key: string): any;
    }

    /**
     * Initialize this package so it is ready to service requests
     *
     * @param {IReadOnlyConf} config Configuration parameters that originate from the command line and config files
     */
    export function init(config: IReadOnlyConf): void {
        if (!initialized) {
            language = config.get("lang");
            resources.init(language, path.join(__dirname, "resources"));

            platforms = [];
            platforms.push(new IOSAgent(config));
            initialized = true;
        }
    };

    /**
     * Download a packaged app ready to be deployed to a device
     * 
     * @param {BuildInfo} buildInfo Information specifying the build
     * @param {express.Request} req The HTTP request being serviced
     * @param {express.Response} res The response to the HTTP request, which must be sent by this function
     * @param {Function} callback A callback indicating whether any errors occurred so the build manager can keep track
     */
    export function downloadBuild(buildInfo: BuildInfo, req: express.Request, res: express.Response, callback: (err: any) => void): void {
        var platform: IPlatform = getPlatform(buildInfo);
        if (platform) {
            platform.downloadBuild(buildInfo, req, res, callback);
        } else {
            res.status(404).send(resources.getStringForLanguage(req, "UnsupportedPlatform"));
        }
    }

    /**
     * Launch an app in a simulator or emulator
     * 
     * @param {BuildInfo} buildInfo Information specifying the build
     * @param {express.Request} req The HTTP request being serviced
     * @param {express.Response} res The response to the HTTP request, which must be sent by this function
     */
    export function emulateBuild(buildInfo: BuildInfo, req: express.Request, res: express.Response): void {
        var platform: IPlatform = getPlatform(buildInfo);
        if (platform) {
            platform.emulateBuild(buildInfo, req, res);
        } else {
            res.status(404).send(resources.getStringForLanguage(req, "UnsupportedPlatform"));
        }
    }

    /**
     * Deploy an app to a device attached to the build server
     * 
     * @param {BuildInfo} buildInfo Information specifying the build
     * @param {express.Request} req The HTTP request being serviced
     * @param {express.Response} res The response to the HTTP request, which must be sent by this function
     */
    export function deployBuild(buildInfo: BuildInfo, req: express.Request, res: express.Response): void {
        var platform: IPlatform = getPlatform(buildInfo);
        if (platform) {
            platform.deployBuildToDevice(buildInfo, req, res);
        } else {
            res.status(404).send(resources.getStringForLanguage(req, "UnsupportedPlatform"));
        }
    }

    /**
     * Launch an app on a device attached to the build server
     * 
     * @param {BuildInfo} buildInfo Information specifying the build
     * @param {express.Request} req The HTTP request being serviced
     * @param {express.Response} res The response to the HTTP request, which must be sent by this function
     */
    export function runBuild(buildInfo: BuildInfo, req: express.Request, res: express.Response): void {
        var platform: IPlatform = getPlatform(buildInfo);
        if (platform) {
            platform.runOnDevice(buildInfo, req, res);
        } else {
            res.status(404).send(resources.getStringForLanguage(req, "UnsupportedPlatform"));
        }
    }

    /**
     * Enable debugging for the specified build
     * 
     * @param {BuildInfo} buildInfo Information specifying the build
     * @param {express.Request} req The HTTP request being serviced
     * @param {express.Response} res The response to the HTTP request, which must be sent by this function
     */
    export function debugBuild(buildInfo: BuildInfo, req: express.Request, res: express.Response): void {
        var platform: IPlatform = getPlatform(buildInfo);
        if (platform) {
            platform.debugBuild(buildInfo, req, res);
        } else {
            res.status(404).send(resources.getStringForLanguage(req, "UnsupportedPlatform"));
        }
    }

    /**
     * Validate whether the request appears to be a valid build request
     *
     * @param {express.Request} request The HTTP request being serviced
     * @param {string[]} errors A list of errors to append to that explain why this is not a valid request
     * @returns {boolean} True if the request is valid, false otherwise
     */
    export function validateBuildRequest(request: express.Request, errors: string[]): boolean {
        var cordovaVersion: string = request.query.vcordova || null;
        var buildCommand: string = request.query.command || "build";
        var configuration: string = request.query.cfg || "release";

        if (!cordovaVersion) {
            errors.push(resources.getStringForLanguage(request, "BuildRequestMissingCordovaVersion"));
        }

        if (buildCommand !== "build") {
            errors.push(resources.getStringForLanguage(request, "BuildRequestUnsupportedCommand", buildCommand));
        }

        if (configuration !== "debug" && configuration !== "release") {
            errors.push(resources.getStringForLanguage(request, "BuildRequestUnsupportedConfiguration", configuration));
        }

        return errors.length === 0;
    }

    /**
     * Build the specified app
     * 
     * @param {BuildInfo} buildInfo Information specifying the build
     * @param {Function} callback A callback to pass back the successful or failed build
     */
    export function build(buildInfo: BuildInfo, callback: (resultBuildInfo: BuildInfo) => void): void {
        var platform: IPlatform = getPlatform(buildInfo);
        if (!platform) {
            buildInfo.updateStatus(BuildInfo.INVALID, "UnsupportedPlatform");
            callback(buildInfo);
            return;
        }

        var cordovaAppError = validateCordovaApp(buildInfo, buildInfo.appDir);
        if (cordovaAppError) {
            buildInfo.updateStatus(BuildInfo.INVALID, cordovaAppError.id, cordovaAppError.args);
            callback(buildInfo);
            return;
        }

        var cfg = new utils.CordovaConfig(path.join(buildInfo.appDir, "config.xml"));
        buildInfo["appName"] = cfg.name();

        buildInfo.updateStatus(BuildInfo.BUILDING);

        // Fork off to a child build process. This allows us to save off all stdout for that build to it's own log file. And in future we can 
        // have multiple builds in parallel by forking multiple child processes (with some max limit.)
        var buildProcess: child_process.ChildProcess;
        buildProcess = platform.createBuildProcess();
        var buildLogger = new ProcessLogger();
        buildLogger.begin(buildInfo.buildDir, "build.log", buildInfo.buildLang, buildProcess);

        buildProcess.on("message", function (resultBuildInfo: BuildInfo): void {
            buildInfo.updateStatus(resultBuildInfo.status, resultBuildInfo.messageId, resultBuildInfo.messageArgs);

            buildProcess.kill();
            callback(buildInfo);
        });
        buildProcess.on("exit", function (exitCode: number): void {
            if (buildInfo.status === BuildInfo.BUILDING) {
                buildInfo.updateStatus(BuildInfo.ERROR, "BuildFailedUnexpectedly");
                callback(buildInfo);
            }
        });
        buildProcess.send({ buildInfo: buildInfo, language: language }, null);
    }

    // This is basic validation. The build itself will fail if config.xml is not valid, or more detailed problems with the submission.
    function validateCordovaApp(buildInfo: BuildInfo, appDir: string): { id: string; args?: any[] } {
        if (!fs.existsSync(path.join(appDir, "config.xml"))) {
            return { id: "InvalidCordovaAppMissingConfigXml" };
        }

        try {
            var cfg = new utils.CordovaConfig(path.join(buildInfo.appDir, "config.xml"));
            var appName = cfg.name();
            if (!utils.UtilHelper.isValidCordovaAppName(appName)) {
                return { id: "InvalidCordovaAppUnsupportedAppName", args: [appName, utils.UtilHelper.invalidAppNameCharacters()] };
            }
            // TODO validate that start page exists (content src='index.html')
        } catch (e) {
            return { id: "InvalidCordovaAppBadConfigXml", args: e.message };
        }

        if (!fs.existsSync(path.join(appDir, "www"))) {
            return { id: "InvalidCordovaAppMissingWww" };
        }

        return null;
    }

    function getPlatform(buildInfo: BuildInfo): IPlatform {
        for (var i = 0; i < platforms.length; ++i) {
            var platform: IPlatform = platforms[i];
            if (platform.canServiceRequest(buildInfo)) {
                return platform;
            }
        }

        return null;
    }
}

export = TacoRemoteLib;