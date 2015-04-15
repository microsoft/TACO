/**
 * ******************************************************
 *                                                       *
 *   Copyright (C) Microsoft. All rights reserved.       *
 *                                                       *
 * ******************************************************
 */
/// <reference path="../typings/taco-utils.d.ts" />

"use strict";
import kitHelper = require ("./kit-helper");

module TacoKits { 
    /// <disable code="SA1301" justification="We are exporting classes" />
    export var KitHelper = kitHelper.KitHelper;
    /// <enable code="SA1301" />
}

export = TacoKits;
