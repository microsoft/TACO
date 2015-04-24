/// <reference path="../../typings/tacoUtils.d.ts" />

"use strict";

import tacoUtility = require("../resourceManager");
var resourceManager: tacoUtility.ResourceManager = new tacoUtility.ResourceManager(__dirname);
export = resourceManager;