/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../typings/lodash.d.ts" />

"use strict";

import _ = require("lodash");

module TacoUtility {
    export class PromisesUtils {
        public static executeAfter<T>(valueOrPromise: T, afterCallback: { (): void }, failCallback?: { (reason: any): void }): T {
            var valueAsPromise = <Q.Promise<any>> <Object> valueOrPromise;
            if (_.isObject(valueAsPromise) && _.isFunction(valueAsPromise.finally)) {
                // valueOrPromise must be a promise. We'll add the callback as a finally handler
                return <T> <Object> valueAsPromise.finally(afterCallback).fail(failCallback);
            } else {
                // valueOrPromise is just a value. We'll execute the callback now
                afterCallback();
                return valueOrPromise;
            }
        }
    }
}

export = TacoUtility;
