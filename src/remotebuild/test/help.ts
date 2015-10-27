/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/should.d.ts"/>
/// <reference path="../../typings/nconf.d.ts" />
/// <reference path="../../typings/tacoUtils.d.ts"/>

"use strict";

/* tslint:disable:no-var-requires */
// var require needed for should module to work correctly
// Note not import: We don't want to refer to shouldModule, but we need the require to occur since it modifies the prototype of Object.
var shouldModule: any = require("should");
/* tslint:enable:no-var-requires */

/* tslint:disable:no-var-requires */
// Special case to allow using color package with index signature for style rules
var colors: any = require("colors/safe");
/* tslint:enable:no-var-requires */

import nconf = require("nconf");
import path = require("path");
import Q = require("q");

import tacoUtils = require("taco-utils");
import Help = require("../lib/help");
import ms = require("./utils/memoryStream");
import cli = require("../lib/cli");
import RemoteBuildConf = require("../lib/remoteBuildConf");

import UtilHelper = tacoUtils.UtilHelper;

import ICommandData = tacoUtils.Commands.ICommandData;
//import CommandHelper = require("./utils/commandHelper");
//import ICommand = tacoUtils.Commands.ICommand;

function parseRemoteBuildConf(): RemoteBuildConf {
    // Configuration preference: command line, then anything in a config file if specified by the --config arg, then some defaults for options not yet set
    nconf.argv();
    // Default to using TACO_HOME/RemoteBuild.config
    // If that file doesn't exist, then this will be equivalent to nconf.use("memory") as long as we don't try to save it out
    var configFile: string = nconf.get("config") || path.join(UtilHelper.tacoHome, "RemoteBuild.config");
    nconf.file({ file: configFile });

    return new RemoteBuildConf(nconf);
}

describe("help for remotebuild", function (): void {
    var remotebuildConf = parseRemoteBuildConf();
    var help: Help = new Help(remotebuildConf);

    var stdoutWrite = process.stdout.write; // We save the original implementation, so we can restore it later
    var memoryStdout: ms.MemoryStream;
    var previous: boolean;

    function helpRun(command: string): Q.Promise<any> {
        var data: ICommandData = {
            options: {},
            original: [command],
            remain: [command]
        };

        return help.run(data);
    };

    function testHelpForCommand(command: string, expectedLines: string[], done: MochaDone): void {
        helpRun(command).done(() => {
            var expected: string = expectedLines.join("\n");
            var actual: string = colors.strip(memoryStdout.contentsAsText()); // The colors add extra characters
            actual = actual.replace(/ (\.+) ?\n  +/gm, " $1 "); // We undo the word-wrapping
            actual = actual.replace(/ +$/gm, ""); // Remove useless spaces at the end of a line
            actual.should.be.equal(expected);
            done();
        }, done);
    }

    before(() => {
        previous = process.env["TACO_UNIT_TEST"];
        process.env["TACO_UNIT_TEST"] = true;
    });

    after(() => {
        // We just need to reset the stdout just once, after all the tests have finished
        process.stdout.write = stdoutWrite;
        process.env["TACO_UNIT_TEST"] = previous;
    });

    beforeEach(() => {
        memoryStdout = new ms.MemoryStream; // Each individual test gets a new and empty console
        process.stdout.write = memoryStdout.writeAsFunction(); // We'll be printing into an "in-memory" console, so we can test the output
    });

    it("prints the help for remotebuild", function (done: MochaDone): void {
        testHelpForCommand("", [
            "",
            "CommandCreateDescription",
            "",
            "   taco create <PATH> [ID [NAME [CONFIG]]] [--OPTIONS]",
            "",
            "CommandHelpUsageParameters",
            "   PATH ............................ CommandCreateArgsPath",
            "   ID .............................. CommandCreateArgsId",
            "   NAME ............................ CommandCreateArgsName",
            "   CONFIG .......................... CommandCreateArgsConfig",
            "CommandHelpUsageOptions",
            "      --kit [NAME] ................. CommandCreateOptionsKit",
            "      --template <NAME|GIT-URL> .... CommandCreateOptionsTemplate",
            "      --cordova <VERSION> .......... CommandCreateOptionsCordova",
            "      --copy-from|src <PATH> ....... CommandCreateOptionsCopy",
            "      --link-to <PATH> ............. CommandCreateOptionsLinkto",
            ""], done);
    });
});