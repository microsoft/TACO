/// <reference path="../../typings/node.d.ts" />
"use strict";

import tacoUtils = require ("taco-utils");
import resourceManager = require ("../resources/resourceManager");

class TacoWarningHelper {
    public static get(errorToken: string, ...optionalArgs: any[]): tacoUtils.TacoWarning {
        return tacoUtils.TacoWarning.getWarning(errorToken, resourceManager, optionalArgs);
    }
}

export = TacoWarningHelper;
