/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/tacoUtils.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/helpCommandBase.d.ts" />

"use strict";

import path = require ("path");

import tacoUtility = require ("taco-utils");
import HelpCommandBase = tacoUtility.HelpCommandBase;

import telemetry = tacoUtility.Telemetry;

/*
 * Help handles "Taco Help"
 */
class Help extends HelpCommandBase {
    private static TacoString: string = "taco";
    constructor() {
        super(Help.TacoString, path.join(__dirname, "./commands.json"), require("../resources/resourceManager"));
    }

    public run(data: tacoUtility.Commands.ICommandData): Q.Promise<any> {
        var helpEvent = new telemetry.TelemetryEvent("taco/help");
        helpEvent.properties["args"] = data.original.join(", ");
        telemetry.send(helpEvent);

        return super.run(data);
    }
}

export = Help;