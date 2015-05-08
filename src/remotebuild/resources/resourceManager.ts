/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../../typings/tacoUtils.d.ts" />

"use strict";

import tacoUtility = require ("taco-utils");
var resourceManager: tacoUtility.ResourceManager = new tacoUtility.ResourceManager(__dirname);
export = resourceManager;
