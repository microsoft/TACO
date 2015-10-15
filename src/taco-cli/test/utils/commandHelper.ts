/**
  * ******************************************************
  *                                                       *
  *   Copyright (C) Microsoft. All rights reserved.       *
  *                                                       *
  *******************************************************
  */
/// <reference path="../../../typings/tacoUtils.d.ts" />

import path = require ("path");

import tacoUtility = require ("taco-utils");

import commands = tacoUtility.Commands;
import CommandsFactory = commands.CommandFactory;

class CommandHelper {
    private static commandsFactory: CommandsFactory = new CommandsFactory(path.join(__dirname, "../../cli/commands.json"));

    /**
     * Gets specified task object for use in testing.
     */
    public static getCommand(name: string): commands.ICommand {
        return CommandHelper.commandsFactory.getTask(name, [], path.join(__dirname, "..", "..", "cli"));
    }
}

export = CommandHelper;
