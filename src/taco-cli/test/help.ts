/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/should.d.ts"/>
/// <reference path="../../typings/tacoUtils.d.ts"/>

"use strict";

var should_module = require("should"); // Note not import: We don't want to refer to should_module, but we need the require to occur since it modifies the prototype of Object.

import tacoUtils = require ("taco-utils");
import Help = require ("../cli/help");
import ms = require ("./utils/memoryStream");

var colors = require("colors/safe");

import commands = tacoUtils.Commands.ICommandData;

describe("help for a command", function (): void {
    function helpRun(command: string): Q.Promise<any> {
        var help = new Help();
        var data: commands = {
            options: {},
            original: [command],
            remain: [command]
        };

        return help.run(data);
    }

    function testHelpForCommand(command: string, expectedLines: string[], done: MochaDone): void {
        helpRun(command).done(() => {
            var expected = expectedLines.join("\n");
            var actual = colors.strip(memoryStdout.contentsAsText()); // The colors add extra characters
            actual = actual.replace(/ (\.+) ?\n  +/gm, " $1 "); // We undo the word-wrapping
            actual = actual.replace(/ +$/gm, ""); // Remove useless spaces at the end of a line
            actual.should.be.equal(expected);
            done();
        }, done);
    }

    var stdoutWrite = process.stdout.write; // We save the original implementation, so we can restore it later
    var memoryStdout: ms.MemoryStream;
    var previous: boolean;

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

    it("prints the help for create", function (done: MochaDone): void {
        testHelpForCommand("create", [
            "CommandCreateDescription",
            "   taco create <PATH> [ID [NAME [CONFIG]]] [--options]",
            "",
            "CommandHelpUsageParameters",
            "   PATH ......................... CommandCreateArgsPath",
            "   ID ........................... CommandCreateArgsId",
            "   NAME ......................... CommandCreateArgsName",
            "   CONFIG ....................... CommandCreateArgsConfig",
            "CommandHelpUsageOptions",
            "      --kit [NAME] .............. CommandCreateOptionsKit",
            "      --template [NAME] ......... CommandCreateOptionsTemplate",
            "      --cli <VERSION> ........... CommandCreateOptionsCli",
            "      --copy-from|src <PATH> .... CommandCreateOptionsCopy",
            "      --link-to <PATH> .......... CommandCreateOptionsLinkto",
            ""], done);
    });

    it("prints the help for templates", function (done: MochaDone): void {
        testHelpForCommand("templates", [
            "CommandTemplatesDescription",
            "   taco templates",
            "",
            ""], done);
    });

    it("prints the help for remote", function (done: MochaDone): void {
        testHelpForCommand("remote", [
            "CommandRemoteDescription",
            "   taco remote COMMAND",
            "",
            "CommandHelpUsageParameters",
            "   COMMAND .............. CommandRemoteSubcommandDescription",
            "   add <PLATFORM> ....... CommandRemoteAddSubcommandDescription",
            "   remove <PLATFORM> .... CommandRemoteRemoveSubcommandDescription",
            "   list ................. CommandRemoteListSubcommandDescription",
            "CommandHelpUsageAliases",
            "   rm -> remove",
            "   ls -> list",
            ""], done);
    });

    it("prints the help for platform", function (done: MochaDone): void {
        testHelpForCommand("platform", [
            "CommandPlatformDescription",
            "   taco platform [COMMAND] [--options]",
            "",
            "CommandHelpUsageParameters",
            "   COMMAND ............... CommandPlatformSubcommandDescription",
            "   add <PLAT-SPEC> ....... CommandPlatformAddSubcommandDescription",
            "        --usegit ......... CommandPlatformUsegitDescription",
            "        --save ........... CommandPlatformSaveAddDescription",
            "        --link ........... CommandPlatformLinkDescription",
            "   remove <PLATFORM> ..... CommandPlatformRemoveSubcommandDescription",
            "        --save ........... CommandPlatformSaveRemoveDescription",
            "   list .................. CommandPlatformListSubcommandDescription",
            "   update <PLAT-SPEC> .... CommandPlatformUpdateSubcommandDescription",
            "        --usegit ......... CommandPlatformUsegitDescription",
            "        --save ........... CommandPlatformSaveUpdateDescription",
            "   check ................. CommandPlatformCheckSubcommandDescription",
            "CommandHelpUsageAliases",
            "   platforms -> platform",
            "   rm -> remove",
            "   ls -> list",
            ""], done);
    });

    it("prints the help for plugin", function (done: MochaDone): void {
        testHelpForCommand("plugin", ["CommandPluginDescription",
            "   taco plugin [COMMAND] [--options]",
            "",
            "CommandHelpUsageParameters",
            "   COMMAND ............................ CommandPluginSubcommandDescription",
            "   add <PLAT-SPEC> .................... CommandPluginAddSubcommandDescription",
            "        [--searchpath <DIRECTORY>] .... CommandPluginSearchPathDescription",
            "        [--noregistry] ................ CommandPluginNoRegistryDescription",
            "        [--link] ...................... CommandPluginLinkDescription",
            "        [--save] ...................... CommandPluginSaveAddDescription",
            "        [--shrinkwrap] ................ CommandPluginShrinkwrapDescription",
            "   remove <PLUGINID> [...] ............ CommandPluginRemoveSubcommandDescription",
            "        [--save] ...................... CommandPluginSaveRemoveDescription",
            "   list ............................... CommandPluginListSubcommandDescription",
            "   search ............................. CommandPluginSearchSubcommandDescription",
            "CommandHelpUsageAliases",
            "   plugins -> plugin",
            "   rm -> remove",
            "   ls -> list",
            ""], done);
    });

    it("prints the help for kit", function (done: MochaDone): void {
        testHelpForCommand("kit", ["CommandKitDescription",
            "   taco kit [COMMAND] [--options]",
            "",
            "CommandHelpUsageParameters",
            "   COMMAND ................ CommandKitSubcommandDescription",
            "   list ................... CommandKitListSubcommandDescription",
            "        --json <PATH> ..... CommandKitJsonOptionDescription",
            "        --kit <KIT-ID> .... CommandKitOptionKitDescription",
            ""], done);
    });

    it("prints the help for build", function (done: MochaDone): void {
        testHelpForCommand("build", [
            "CommandBuildDescription",
            "   taco build [PLATFORM] [--options]",
            "",
            "CommandHelpUsageParameters",
            "   PLATFORM ............ CommandBuildPlatformDescription",
            "CommandHelpUsageOptions",
            "      --remote ......... CommandBuildRemoteDescription",
            "      --local .......... CommandBuildLocalDescription",
            "      --clean .......... CommandBuildCleanDescription",
            "      --debug .......... CommandBuildDebugDescription",
            "      --release ........ CommandBuildReleaseDescription",
            "      --device ......... CommandBuildDeviceDescription",
            "      --emulator ....... CommandBuildEmulatorDescription",
            "      --target ......... CommandBuildTargetDescription",
            ""], done);
    });

    it("prints the help for run", function (done: MochaDone): void {
        testHelpForCommand("run", [
            "CommandRunDescription",
            "   taco run [PLATFORM] [--options]",
            "",
            "CommandHelpUsageParameters",
            "   PLATFORM ............ CommandRunPlatformDescription",
            "CommandHelpUsageOptions",
            "      --remote ......... CommandRunRemoteDescription",
            "      --local .......... CommandRunLocalDescription",
            "      --nobuild ........ CommandRunNobuildDescription",
            "      --debuginfo ...... CommandRunDebuginfoDescription",
            "      --debug .......... CommandRunDebugDescription",
            "      --release ........ CommandRunReleaseDescription",
            "      --device ......... CommandRunDeviceDescription",
            "      --emulator ....... CommandRunEmulatorDescription",
            "      --target ......... CommandRunTargetDescription",
            ""], done);
    });

    it("prints the help for kit", function (done: MochaDone): void {
        testHelpForCommand("install-reqs", [
            "CommandInstallReqsDescription",
            "   taco install-reqs [PLATFORM]",
            "",
            "CommandHelpUsageParameters",
            "   [PLATFORM] .......... CommandInstallReqsPlatformDescription",
            ""], done);
    });
});