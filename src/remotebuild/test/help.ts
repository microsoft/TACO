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
            "CommandHelpUsageSynopsis",
			"   remotebuild <COMMAND>",
			"",
			"CommandHelpTableTitle",
			"   start ............... CommandStartDescription",
			"   test ................ CommandTestDescription",
			"   certificates ........ CommandGenerateDescription",
			"   saveconfig .......... CommandSaveConfigDescription",
			"   help ................ CommandHelpDescription",
			"   version ............. CommandVersionDescription",
			"",
			"RemoteBuildModuleHelpText",
            ""], done);
    });

	it("prints the help for remotebuild start", function (done: MochaDone): void {
        testHelpForCommand("start", [
			"",
            "CommandStartDescription",
			"",
			"   remotebuild start [options]",
			"",
			"CommandHelpUsageOptions",
			"      --serverDir [DIRECTORY] ............ RemoteBuildConfServerDir",
			"      --port [PORT-NUM] .................. RemoteBuildConfPort",
			"      --secure [true|false] .............. RemoteBuildConfSecure",
			"      --lang [LANGUAGE] .................. RemoteBuildConfLang",
			"      --pinTimeout [MINS] ................ RemoteBuildConfPinTimeout",
			"      --certExpirationDays [NUM_DAYS] .... RemoteBuildConfCertExpirationDays",
			"      --hostname [HOSTNAME] .............. RemoteBuildConfHostname",
			"      --config [PATH] .................... RemoteBuildConfConfigFile",
			"CommandHelpUsageExamples",
			"   * RemoteBuildStartExample1",
			"",
			"        remotebuild",
			"",
			"   * RemoteBuildStartExample2",
			"",
			"        remotebuild --serverDir ~/other-builds --port 4000 --secure false",
			"",
			"CommandHelpUsageNotes",
			"   1. RemoteBuildNotes1",
			"",
			"   2. RemoteBuildNotes2",
			"",
			"",
			"RemoteBuildModuleHelpText",
            ""], done);
    });

	it("prints the help for remotebuild test", function (done: MochaDone): void {
        testHelpForCommand("test", [
			"",
            "CommandTestDescription",
			"",
			"   remotebuild test [options]",
			"",
			"CommandHelpUsageOptions",
			"      --device ........................... CommandTestDevice",
			"      --serverDir [DIRECTORY] ............ RemoteBuildConfServerDir",
			"      --port [PORT_NUM] .................. RemoteBuildConfPort",
			"      --secure [true|false] .............. RemoteBuildConfSecure",
			"      --lang [LANGUAGE] .................. RemoteBuildConfLang",
			"      --pinTimeout [MINS] ................ RemoteBuildConfPinTimeout",
			"      --certExpirationDays [NUM_DAYS] .... RemoteBuildConfCertExpirationDays",
			"      --hostname [HOSTNAME] .............. RemoteBuildConfHostname",
			"      --config [PATH] .................... RemoteBuildConfConfigFile",
			"CommandHelpUsageExamples",
			"   * RemoteBuildTestExample1",
			"",
			"        remotebuild test",
			"",
			"   * RemoteBuildTestExample2",
			"",
			"        remotebuild test --device --config config.json",
			"",
			"CommandHelpUsageNotes",
			"   1. RemoteBuildNotes1",
			"",
			"   2. RemoteBuildNotes2",
			"",
			"",
			"RemoteBuildModuleHelpText",
            ""], done);
    });

	it("prints the help for remotebuild certificates", function (done: MochaDone): void {
        testHelpForCommand("certificates", [
			"",
            "CommandGenerateDescription",
			"",
			"   remotebuild certificates [COMMAND] [Options]",
			"",
			"CommandHelpUsageParameters",
			"   generate .............................. CommandGenerateDescription",
			"   reset ................................. CommandResetDescription",
			"CommandHelpUsageOptions",
			"      --serverDir [DIRECTORY] ............ RemoteBuildConfServerDir",
			"      --port [PORT-NUM] .................. RemoteBuildConfPort",
			"      --lang [LANGUAGE] .................. RemoteBuildConfLang",
			"      --certExpirationDays [NUM_DAYS] .... RemoteBuildConfCertExpirationDays",
			"      --hostname [HOSTNAME] .............. RemoteBuildConfHostname",
			"      --config [PATH] .................... RemoteBuildConfConfigFile",
			"CommandHelpUsageExamples",
			"   * GenerateClientCertExample1",
			"",
			"        remotebuild certificates generate --certExpirationDays 365",
			"",
			"   * ResetServerCertExample1",
			"",
			"        remotebuild certificates reset --certExpirationDays 365",
			"",
			"CommandHelpUsageNotes",
			"   1. RemoteBuildNotes1",
			"",
			"   2. RemoteBuildNotes2",
			"",
			"",
			"RemoteBuildModuleHelpText",
            ""], done);
    });

	it("prints the help for remotebuild saveconfig", function (done: MochaDone): void {
        testHelpForCommand("saveconfig", [
			"",
            "CommandSaveConfigDescription",
			"",
			"   remotebuild saveconfig [Options]",
			"",
			"CommandHelpUsageOptions",
			"      --serverDir [DIRECTORY] ............ RemoteBuildConfServerDir",
			"      --port [PORT-NUM] .................. RemoteBuildConfPort",
			"      --lang [LANGUAGE] .................. RemoteBuildConfLang",
			"      --certExpirationDays [NUM_DAYS] .... RemoteBuildConfCertExpirationDays",
			"      --hostname [HOSTNAME] .............. RemoteBuildConfHostname",
			"      --config [PATH] .................... RemoteBuildConfConfigFile",
			"",
			"RemoteBuildModuleHelpText",
            ""], done);
    });

	it("prints the help for remotebuild version", function (done: MochaDone): void {
        testHelpForCommand("version", [
			"",
            "CommandVersionDescription",
			"",
			"   remotebuild version",
			"",
			"",
			"RemoteBuildModuleHelpText",
            ""], done);
    });
});