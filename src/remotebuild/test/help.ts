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
/// <reference path="../../typings/tacoTestsUtils.d.ts"/>

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
import Q = require("q");

import tacoUtils = require("taco-utils");
import Help = require("../lib/help");
import cli = require("../lib/cli");
import RemoteBuildConf = require("../lib/remoteBuildConf");
import tacoTestsUtils = require("taco-tests-utils");

import UtilHelper = tacoUtils.UtilHelper;
import MemoryStream = tacoTestsUtils.MemoryStream;

import ICommandData = tacoUtils.Commands.ICommandData;

describe("help for remotebuild", function (): void {
    var help: Help;
    var stdoutWrite = process.stdout.write; // We save the original implementation, so we can restore it later
    var memoryStdout: MemoryStream;
    var previous: boolean;

    function helpRun(command: string): Q.Promise<any> {
        return help.run(command ? [command] : []);
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

        nconf.overrides({});
        nconf.defaults({});
        nconf.use("memory");

        var remotebuildConf: RemoteBuildConf = new RemoteBuildConf(nconf);
        help = new Help(remotebuildConf);
    });

    after(() => {
        // We just need to reset the stdout just once, after all the tests have finished
        process.stdout.write = stdoutWrite;
        delete process.env["TACO_UNIT_TEST"];

        nconf.reset();
    });

    beforeEach(() => {
        memoryStdout = new MemoryStream; // Each individual test gets a new and empty console
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

    it("prints the help for taco-remote module", function (done: MochaDone): void {
        testHelpForCommand("taco-remote", [
            "",
            "TacoRemoteHelpDescription",
            "CommandHelpUsageOptions",
            "      allowsEmulate .............. TacoRemoteConfigAllowsEmulate",
            "      deleteBuildsOnShutdown ..... TacoRemoteConfigDeleteBuildsOnShutdown",
            "      maxBuildsInQueue ........... TacoRemoteConfigMaxBuildsInQueue",
            "      maxBuildsToKeep ............ TacoRemoteConfigMaxBuildsToKeep",
            "      nativeDebugProxyPort ....... TacoRemoteConfigNativeDebugProxyPort",
            "      webDebugProxyDevicePort .... TacoRemoteConfigWebDebugProxyDevicePort",
            "      webDebugProxyPortMin ....... TacoRemoteConfigWebDebugProxyPortMin",
            "      webDebugProxyPortMax ....... TacoRemoteConfigWebDebugProxyPortMax",
            "CommandHelpUsageExamples",
            "   * TacoRemoteHelpExample",
            "",
            "      {",
            "         \"port\": 3002,",
            "         \"modules\": {",
            "            \"taco-remote\": {",
            "               \"mountPath\": \"cordova\",",
            "               \"maxBuildsToKeep\": 0,",
            "               \"webDebugProxyDevicePort\": 4321,",
            "               \"deleteBuildsOnShutdown\": true",
            "            }",
            "         }",
            "      }",
            "",
            "CommandHelpUsageNotes",
            "   * TacoRemoteHelpNotes",
            "",
            "",
            "RemoteBuildModuleHelpText",
            ""], done);
    });
});
