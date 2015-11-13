/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />

"use strict";

import Q = require ("q");
import simulate = require ("taco-simulate");

import tacoUtils = require ("taco-utils");
import TacoErrorCodes = require ("./tacoErrorCodes");
import errorHelper = require ("./tacoErrorHelper");

import commands = tacoUtils.Commands;
import telemetryHelper = tacoUtils.TelemetryHelper;
import ICommandTelemetryProperties = tacoUtils.ICommandTelemetryProperties;

class Simulate extends commands.TacoCommandBase {
    private static KNOWN_OPTIONS: Nopt.FlagTypeMap = {
        target: String
    };

    private static parseArguments(args: commands.ICommandData): commands.ICommandData {
        return tacoUtils.ArgsHelper.parseArguments(Simulate.KNOWN_OPTIONS, {}, args.original, 0);
    }

    private static generateTelemetryProperties(platform: string, target: string): ICommandTelemetryProperties {
        var telemetryProperties: ICommandTelemetryProperties = {};
        telemetryProperties["platform"] = telemetryHelper.telemetryProperty(platform);
        telemetryProperties["target"] = telemetryHelper.telemetryProperty(target);
        return telemetryProperties;
    }

    private static processExternalError(error: Error): tacoUtils.TacoError {
        return errorHelper.wrap(TacoErrorCodes.CommandSimulateUnknownError, error);
    }

    public run(data: commands.ICommandData): Q.Promise<ICommandTelemetryProperties> {
        var parsed: commands.ICommandData = null;
        try {
            parsed = Simulate.parseArguments(data);
        } catch (err) {
            return Q.reject<ICommandTelemetryProperties>(err);
        }

        var platform: string = parsed.remain[0] || "browser";
        var target: string = parsed.options["target"] || "chrome";

        var telemetryObject: tacoUtils.IExternalTelemetryProvider = telemetryHelper.getExternalTelemetryObject("simulate", {
            platform: platform,
            target: target
        }, Simulate.processExternalError);

        return simulate({platform: platform, target: target, telemetry: telemetryObject}).then(function (): ICommandTelemetryProperties {
            return Simulate.generateTelemetryProperties(platform, target);
        }).catch(function (reason: Error): Q.Promise<ICommandTelemetryProperties> {
            return Q.reject<ICommandTelemetryProperties>(errorHelper.wrap(TacoErrorCodes.CommandSimulateUnknownError, reason, platform, target));
        });
    }

    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
        return true;
    }
}

export = Simulate;
