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
var run;
(function (run) {
    function runProject(options) {
        return cordova.raw.run(options);
    }
    run.runProject = runProject;
    function emulateProject(options) {
        return cordova.raw.emulate(options);
    }
    run.emulateProject = emulateProject;
})(run || (run = {}));
module.exports = run;
//# sourceMappingURL=run.js.map