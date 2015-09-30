/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */
/// <reference path="../../typings/should.d.ts"/>
/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/tacoUtils.d.ts"/>

"use strict";
var should = require("should"); // Note not import: We don't want to refer to should_module, but we need the require to occur since it modifies the prototype of Object.

import fs = require ("fs");
import mocha = require ("mocha");
import path = require ("path");
import Q = require ("q");
import util = require ("util");

import Help = require ("../cli/help");
import resources = require ("../resources/resourceManager");
import Taco = require ("../cli/taco");
import TacoErrorCodes = require ("../cli/tacoErrorCodes");
import tacoUtils = require ("taco-utils");
import Version = require ("../cli/version");

import Commands = tacoUtils.Commands;
import utils = tacoUtils.UtilHelper;

interface ICommandOptionsAndArgsInfo {
    name: string;
    description: string;
}

interface ICommandInfo {
    [commandName: string]: {
        synopsis: string;
        modulePath: string;
        description: string;
        args?: ICommandOptionsAndArgsInfo;
        options?: ICommandOptionsAndArgsInfo;
    };
}

describe("taco meta command tests: ", function (): void {
    // Command list
    var commandsJsonPath = path.resolve(__dirname, "..", "cli", "commands.json");
    fs.existsSync(commandsJsonPath).should.be.true;

    var commands = require(commandsJsonPath);
    commands.should.not.be.empty;

    // Options we are interested in testing
    var tacoValidArgs: string[][] = [[], ["-v"], ["--help"], ["-----help"]];
    var tacoInvalidArgs: string[][] = [["/?"], ["?"]];

    function runHelp(command: string): Q.Promise<any> {
        var help = new Help();

        // Construct CommandData and pass it as argument
        var original: string[] = [];
        var remain: string[] = [];

        original.push(command);
        remain.push(command);

        var commandData: tacoUtils.Commands.ICommandData = {
            options: {},
            original: original,
            remain: remain
        };

        return help.run(commandData);
    };

    function runVersion(): Q.Promise<any> {
        var version = new Version();

        var commandData: tacoUtils.Commands.ICommandData = {
            options: {},
            original: [],
            remain: []
        };
        return version.run(commandData);
    };

    // Run help for a cordova command not overriden by taco - ex, "info"
    describe("taco", function (): void {
        it("help info executes with no error", function (done: MochaDone): void {
            runHelp("info").then(function (): void {
                done();
            }, function (err: tacoUtils.TacoError): void {
                done(err);
            });
        });
    });

    // Run taco command with valid and invalid options
    describe("taco command", function (): void {
        this.timeout(10000);
        tacoValidArgs.forEach(function (optionString: string[]): void {
            it("with options " + optionString + " executes with no error", function (done: MochaDone): void {
                Taco.runWithArgs(optionString).then(function (): void {
                    done();
                }, function (err: tacoUtils.TacoError): void {
                   done(err);
                });
            });
        });

        tacoInvalidArgs.forEach(function (optionString: string[]): void {
            it("with invalid options " + optionString + " executes with expected error", function (done: MochaDone): void {
                Taco.runWithArgs(optionString).then(function (): void {
                    done(new Error("Passing Invalid options to \'taco\' should have failed"));
                }, function (err: any): void {
                    if (err.code = TacoErrorCodes.CordovaCommandFailed) {
                        done();
                    } else {
                        done(new Error("Unexpected error code"));
                    }
                });
            });
        });
    });

    // Run taco version command
    describe("taco version command", function (): void {
        it("should execute without an error", function (done: MochaDone): void {
            runVersion().then(function (): void {
                done();
            }, function (err: tacoUtils.TacoError): void {
                done(err);
            });
        });
    });
});
