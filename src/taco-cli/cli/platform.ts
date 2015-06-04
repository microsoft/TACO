/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/tacoUtils.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />
/// <reference path="../../typings/cordovaExtensions.d.ts" />
/// <reference path="../../typings/rimraf.d.ts" />
"use strict";

import assert = require ("assert");
import child_process = require ("child_process");
import fs = require ("fs");
import nopt = require ("nopt");
import path = require ("path");
import Q = require ("q");
import rimraf = require("rimraf");

import CordovaWrapper = require ("./utils/cordovaWrapper");
import resources = require("../resources/resourceManager");
import Settings = require ("./utils/settings");
import TacoErrorCodes = require ("./tacoErrorCodes");
import errorHelper = require ("./tacoErrorHelper");
import tacoUtility = require ("taco-utils");

import commands = tacoUtility.Commands;
import logger = tacoUtility.Logger;
import level = logger.Level;
import UtilHelper = tacoUtility.UtilHelper;

/**
  * Platform
  *
  * handles "taco platform"
  */
class Platform extends commands.TacoCommandBase implements commands.IDocumentedCommand {
    private static KnownOptions: Nopt.CommandData = {
        usegit: Boolean,
        save: Boolean,
        link: Boolean
    };
    private static ShortHands: Nopt.ShortFlags = {};

    public subcommands: commands.ICommand[] = [
        {
            // Add Platform
            run: Platform.add,
            canHandleArgs(commandData: commands.ICommandData): boolean {
                return true;
            }
        },
        {
            // Remove Platform
            run: Platform.remove,
            canHandleArgs(commandData: commands.ICommandData): boolean {
                return !commandData.options["usegit"] && !!commandData.options["link"];
            }
        },
        {
            // List Platform
            run: Platform.list,
            canHandleArgs(commandData: commands.ICommandData): boolean {
                return !commandData.options["link"];
            }
        },
        {
            // Update Platform
            run: Platform.update,
            canHandleArgs(commandData: commands.ICommandData): boolean {
                return false;
            }
        },
        {
            // Check Platform
            run: Platform.check,
            canHandleArgs(commandData: commands.ICommandData): boolean {
                return false;
            }
        }
    ];

    public name: string = "platform";
    public info: commands.ICommandInfo;

    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
        return true;
    }

    public parseArgs(args: string[]): commands.ICommandData {
        var parsedOptions = tacoUtility.ArgsHelper.parseArguments(Platform.KnownOptions, Platform.ShortHands, args, 0);

        // Raise errors for invalid command line parameters
        if (parsedOptions.options["remote"] && parsedOptions.options["local"]) {
            throw errorHelper.get(TacoErrorCodes.CommandNotBothLocalRemote);
        }

        if (parsedOptions.options["device"] && parsedOptions.options["emulator"]) {
            throw errorHelper.get(TacoErrorCodes.CommandNotBothDeviceEmulate);
        }

        return parsedOptions;
    }

    private static add(commandData: commands.ICommandData): Q.Promise<any> {
        return Q({});
    }

    private static remove(commandData: commands.ICommandData): Q.Promise<any> {
        return Q({});
    }

    private static list(commandData: commands.ICommandData): Q.Promise<any> {
        return Q({});
    }

    private static update(commandData: commands.ICommandData): Q.Promise<any> {
        return Q({});
    }

    private static check(commandData: commands.ICommandData): Q.Promise<any> {
        return Q({});
    }
}

export = Platform;
