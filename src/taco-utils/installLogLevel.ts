/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */
/// <reference path="../typings/node.d.ts" />

"use strict";
module TacoUtility {
    export enum InstallLogLevel {
        undefined = 0, // undefined is falsy, others are truthy
        silent = 1,
        error,
        warn,
        taco,
        info,
        verbose,
        silly,
    }
}

export = TacoUtility;
