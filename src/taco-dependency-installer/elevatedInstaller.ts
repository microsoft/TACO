/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/dependencyInstallerInterfaces.d.ts" />
/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/sanitize-filename.d.ts" />
/// <reference path="../typings/tacoUtils.d.ts" />

"use strict";

import fs = require ("fs");
import net = require ("net");
import path = require ("path");
import Q = require ("q");
import sanitizeFilename = require ("sanitize-filename");

import DependencyDataWrapper = require ("./utils/dependencyDataWrapper");
import InstallerBase = require ("./installers/installerBase");
import InstallerRunner = require ("./installerRunner");
import installerUtils = require ("./utils/installerUtils");
import protocol = require ("./elevatedInstallerProtocol");
import resources = require ("./resources/resourceManager");

import installerDataType = protocol.DataType;
import protocolExitCode = protocol.ExitCode;

// Internal class for an ILogger specifically designed for the communication between the elevatedInstaller and the dependencyInstaller
class InstallerLogger implements protocol.ILogger {
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
        this.socketPath = process.argv[2];
        this.configFile = process.argv[3];
    }

    public run(): void {
        var self = this;

        this.connectToServer()
            .then(function (): Q.Promise<number> {
                self.logger = new InstallerLogger(self.socketHandle);

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