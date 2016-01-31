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
/// <reference path="../../typings/commands.d.ts" />

"use strict";

import tacoUtility = require ("taco-utils");
import util = require("util");

import CordovaWrapper = tacoUtility.CordovaWrapper;
    
class Browser {
    private static DebugPort: number = 9222;
    public static run(data: TacoUtility.Commands.ICommandData): Q.Promise<any> {
        data.original.concat([
            "--",
            "--browserArgs",
            util.format("--remote-debugging-port=%s", Browser.DebugPort)
        ]);
        return CordovaWrapper.run(data)
        .then(() => Q(9222));
    }
}


export = Browser;

