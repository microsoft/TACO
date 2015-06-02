/// <reference path="../typings/node.d.ts" />
"use strict";

import tacoResources = require ("./resources/resourceManager");
import tacoErrorCode = require ("./tacoErrorCodes");
import tacoUtils = require ("taco-utils");

import TacoErrorCode = tacoErrorCode.TacoErrorCode;

class TacoErrorHelper {
    public static get(tacoErrorCode: TacoErrorCode, ...optionalArgs: any[]): tacoUtils.TacoError {
        return tacoUtils.TacoError.getError(TacoErrorCode[tacoErrorCode], <number>tacoErrorCode, tacoResources, optionalArgs);
    }

    public static wrap(tacoErrorCode: TacoErrorCode, innerError: Error, ...optionalArgs: any[]): tacoUtils.TacoError {
        return tacoUtils.TacoError.wrapError(innerError, TacoErrorCode[tacoErrorCode], <number>tacoErrorCode, tacoResources, optionalArgs);
    }
}

export = TacoErrorHelper;