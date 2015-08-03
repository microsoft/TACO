/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/dependencyInstallerInterfaces.d.ts" />
/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/tacoUtils.d.ts" />

"use strict";

import fs = require ("fs");
import net = require ("net");
import os = require ("os");
import path = require ("path");
import Q = require ("q");

import DependencyDataWrapper = require ("./utils/dependencyDataWrapper");
import InstallerBase = require ("./installers/installerBase");
import InstallerRunner = require ("./installerRunner");
import installerUtils = require ("./utils/installerUtils");
import protocol = require ("./elevatedInstallerProtocol");
import resources = require ("./resources/resourceManager");
import tacoErrorCodes = require ("./tacoErrorCodes");
import errorHelper = require ("./tacoErrorHelper");
import tacoUtils = require ("taco-utils");

import installerDataType = protocol.DataType;
import protocolExitCode = protocol.ExitCode;
import tacoLogger = tacoUtils.Logger;
import TacoErrorCodes = tacoErrorCodes.TacoErrorCode;

// Internal class for an ILogger specifically designed for the communication between the elevatedInstaller and the dependencyInstaller on Windows, which requires socket communication over a local server
class SocketLogger implements protocol.ILogger {
    private socketHandle: NodeJSNet.Socket;

    constructor(socket: NodeJSNet.Socket) {
        this.socketHandle = socket;
    }

    public log(message: string): void {
        installerUtils.sendData(this.socketHandle, message);
    }

    public logWarning(message: string): void {
        installerUtils.sendData(this.socketHandle, message, installerDataType.Warning);
    }

    public logError(message: string): void {
        installerUtils.sendData(this.socketHandle, message, installerDataType.Error);
    }

    public promptForEnvVariableOverwrite(name: string): Q.Promise<any> {
        return installerUtils.promptForEnvVariableOverwrite(name, this.socketHandle);
    }
}

// Internal class for an ILogger for communication between the elevatedInstaller and the dependencyInstaller on OSX
class DarwinLogger implements protocol.ILogger {
    public log(message: string): void {
        tacoLogger.log(message);
    }

    public logWarning(message: string): void {
        tacoLogger.logWarning(message);
    }

    public logError(message: string): void {
        tacoLogger.logError(message);
    }

    public promptForEnvVariableOverwrite(name: string): Q.Promise<any> {
        return Q({});
    }
}

/*
 * Takes care of installing the missing third-party dependencies on the user's system. This file should be executed inside a separate process that has administrator privileges. DependencyInstaller.ts
 * is responsible for starting that elevated process.
 * 
 * This script starts by parsing the installation configuration file that DependencyInstaller created in taco_home. The file contains information on what dependencies need to be installed. After
 * parsing and validating the content, specialized installers that know how to handle specific dependencies are instantiated. The user is then presented with a summary of what is about to be
 * installed, and is prompted for confirmation. The specialized installers are then run in order of prerequisites (for example, java needs to be installed before Android SDK). Finally, this process
 * exits with the proper exit code (exit codes are defined in ElevatedInstallerProtocol).
 *
 * Because this is a separate process, and because it is not possible to intercept the stdio of an elevated process from a non-elevated one, the communication between this and DependencyInstaller is
 * made via a local socket that this script connects to and that DependencyInstaller listens to.
 *
 * Note that this specific class only acts as the "entry point" of the elevated installer process, and is responsible for the communication with the dependency installer. The actual installation work
 * (parsing and validating the config file, instantiating specialized installers, running installers) is delegated to the InstallRunner class.
 */
class ElevatedInstaller {    
    private socketPath: string;
    private socketHandle: NodeJSNet.Socket;
    private configFile: string;
    private logger: protocol.ILogger;

    constructor() {
        this.configFile = process.argv[2];
        this.socketPath = process.argv[3];
    }

    public run(): void {
        var self = this;

        this.prepareCommunications()
            .then(function (): Q.Promise<number> {
                var installerRunner: InstallerRunner = new InstallerRunner(self.configFile, self.logger);

                return installerRunner.run();
            })
            .then(function (code: number): void {
                self.exitProcess(code);
            })
            .catch(function (err: Error): void {
                // If we have an uncaught error, log it and exit with a FatalError code
                self.logger.logError(err.message);
                self.exitProcess(protocolExitCode.FatalError);
            });
    }

    private prepareCommunications(): Q.Promise<any> {
        switch (process.platform) {
            case "win32":
                // Instantiate the logger
                this.logger = new SocketLogger(this.socketHandle);

                // Connect to the communication server
                return this.connectToServer();
            case "darwin":
                // Instantiate the logger
                this.logger = new DarwinLogger();
                return Q({});
            default:
                this.logger.logError(errorHelper.get(TacoErrorCodes.UnsupportedPlatform, process.platform).toString());
                this.exitProcess(protocolExitCode.FatalError);
        }
    }

    private connectToServer(): Q.Promise<any> {
        if (!this.socketPath) {
            // If we can't connect to the DependencyInstaller's server, the only way to let the DependencyInstaller know is via exit code
            this.exitProcess(protocolExitCode.CouldNotConnect);
        }

        var deferred: Q.Deferred<any> = Q.defer<any>();

        try {
            this.socketHandle = net.connect(this.socketPath, function (): void {
                deferred.resolve({});
            });
        } catch (err) {
            // If we can't connect to the DependencyInstaller's server, the only way to let the DependencyInstaller know is via exit code
            this.exitProcess(protocolExitCode.CouldNotConnect);
        }

        return deferred.promise;
    }

    private exitProcess(code: number): void {
        if (this.socketHandle) {
            this.socketHandle.end();
        }

        process.exit(code);
    }
}

var elevatedInstaller: ElevatedInstaller = new ElevatedInstaller();

elevatedInstaller.run();