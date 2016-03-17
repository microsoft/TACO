// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/// <reference path="../../typings/tacoUtils.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/helpCommandBase.d.ts" />

"use strict";

import path = require ("path");

import tacoUtility = require ("taco-utils");
import HelpCommandBase = tacoUtility.HelpCommandBase;

/**
 * Help handles "Taco Help"
 */
class Help extends HelpCommandBase {
    private static TACO_CLI_NAME: string = "taco";
    constructor() {
        super(Help.TACO_CLI_NAME, path.join(__dirname, "./commands.json"), require("../resources/resourceManager"));
        require("./logo");
    }
}

export = Help;
