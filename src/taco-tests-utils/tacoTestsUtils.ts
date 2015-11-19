/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

"use strict";
import nodeFakes = require("./nodeFakes");
import projectHelper = require("./projectHelper");
import telemetryFakes = require("./telemetryFakes");
import memoryStream = require("./memoryStream");
import tacoErrorTestHelper = require("./tacoErrorTestHelper");

module TacoTestsUtils {
    /* tslint:disable:variable-name */
    // We mostly export classes here from taco-tests-utils and we prefer keeping them pascal cased
    // put more classes here, known limitation that classes in external modules CANNOT span multiple files
    export var NodeFakes: typeof nodeFakes.NodeFakes = nodeFakes.NodeFakes;
    export var TelemetryFakes: typeof telemetryFakes.TelemetryFakes = telemetryFakes.TelemetryFakes;
    export var ProjectHelper: typeof projectHelper.ProjectHelper = projectHelper.ProjectHelper;
    export var MemoryStream: typeof memoryStream.MemoryStream = memoryStream.MemoryStream;
    export var TacoErrorTestHelper: typeof tacoErrorTestHelper.TacoErrorTestHelper = tacoErrorTestHelper.TacoErrorTestHelper;
    /* tslint:enable:variable-name */
}

export = TacoTestsUtils;
