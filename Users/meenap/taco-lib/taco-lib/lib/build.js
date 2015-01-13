/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";
var cordova = require('cordova');
var build;
(function (build) {
    cordova.on('results', console.info);
    cordova.on('log', console.info);
    cordova.on('warn', console.warn);
    cordova.on('error', console.error);
    cordova.on('verbose', console.info);
    cordova.on('before_prepare', beforePrepare);
    cordova.on('after_compile', afterCompile);
    function beforePrepare(data) {
        // Instead of a build, we call prepare and then compile
        // trigger the before_build in case users expect it
        cordova.emit('before_build', data);
    }
    build.beforePrepare = beforePrepare;
    function afterCompile(data) {
        // Instead of a build, we call prepare and then compile
        // trigger the after_build in case users expect it
        cordova.emit('after_build', data);
    }
    build.afterCompile = afterCompile;
    function buildProject(options) {
        return cordova.raw.build(options);
    }
    build.buildProject = buildProject;
    function compileProject(options) {
        return cordova.raw.compile(options);
    }
    build.compileProject = compileProject;
    function prepareProject(options) {
        return cordova.raw.prepare(options);
    }
    build.prepareProject = prepareProject;
})(build || (build = {}));
module.exports = build;
//# sourceMappingURL=build.js.map