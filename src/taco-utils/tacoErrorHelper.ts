// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/// <reference path="../typings/node.d.ts" />
"use strict";

import tacoUtils = require ("./tacoError");
import resourceManager = require ("./resources/resourceManager");
import tacoErrorCodes = require ("./tacoErrorCodes");

import TacoErrorCode = tacoErrorCodes.TacoErrorCode;

class TacoErrorHelper {
    public static get(tacoErrorCode: TacoErrorCode, ...optionalArgs: any[]): tacoUtils.TacoError {
        return tacoUtils.TacoError.getError(TacoErrorCode[tacoErrorCode], <number> tacoErrorCode, resourceManager, ...optionalArgs);
    }

    public static wrap(tacoErrorCode: TacoErrorCode, innerError: Error, ...optionalArgs: any[]): tacoUtils.TacoError {
        return tacoUtils.TacoError.wrapError(innerError, TacoErrorCode[tacoErrorCode], <number> tacoErrorCode, resourceManager, ...optionalArgs);
    }
}

export = TacoErrorHelper;
