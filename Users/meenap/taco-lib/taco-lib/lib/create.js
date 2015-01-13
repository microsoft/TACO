/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";
var cordova = require('cordova');
cordova.on('results', console.info);
cordova.on('log', console.info);
cordova.on('warn', console.warn);
cordova.on('error', console.error);
cordova.on('verbose', console.info);
var create;
(function (create) {
    function createProject(dir, id, name, cfg) {
        return cordova.raw.create(dir, id, name, cfg);
    }
    create.createProject = createProject;
})(create || (create = {}));
module.exports = create;
//# sourceMappingURL=create.js.map