/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import bi = require('../buildInfo');

process.on('message', function (buildRequest: { buildInfo: bi.BuildInfo; language: string }) {
    var buildInfo = bi.createNewBuildInfoFromDataObject(buildRequest.buildInfo);
    buildInfo.updateStatus(bi.ERROR, 'InvalidBuildRequest');
    process.send(buildInfo);
    process.exit(1);
});