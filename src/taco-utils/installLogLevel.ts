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
        silent,
        error,
        warn,
        taco,
        info,
        verbose,
        silly,
    }
}

export = TacoUtility;
