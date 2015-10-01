/// <reference path="../../typings/node.d.ts" />
"use strict";

import tacoUtils = require ("taco-utils");
import resourceManager = require ("../resources/resourceManager");
import TacoErrorCode = require ("./tacoErrorCodes");

class TacoErrorHelper {
    public static get(tacoErrorCode: TacoErrorCode, ...optionalArgs: any[]): tacoUtils.TacoError {
        return tacoUtils.TacoError.getError(TacoErrorCode[tacoErrorCode], <number> tacoErrorCode, resourceManager, optionalArgs);
    }

    public static wrap(tacoErrorCode: TacoErrorCode, innerError: Error, ...optionalArgs: any[]): tacoUtils.TacoError {
        return tacoUtils.TacoError.wrapError(innerError, TacoErrorCode[tacoErrorCode], <number> tacoErrorCode, resourceManager, optionalArgs);
    }
}

export = TacoErrorHelper;
