/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../typings/node.d.ts" />

module TacoUtility {
    export class ProcessUtils {
        public static getProcess(): NodeJS.Process {
            return process;
        }
    }
}

export = TacoUtility;
