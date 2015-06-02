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
    /// <disable code="SA9016" justification="we need to match npm log levels" />
    export enum InstallLogLevel {
        silent,
        warn,
        info,
        verbose,
        silly,
        pretty,
    }
    /// <enable code="SA9016" justification="we need to match npm log levels" />
}

export = TacoUtility;
