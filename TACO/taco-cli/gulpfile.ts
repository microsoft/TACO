/// <reference path="./src/util/typings/node.d.ts" />
/// <reference path="./src/compile/gulpfile.ts" />

var gulp = require('gulp');
require('./src/compile/gulpfile');

import styleCopUtil = require('./src/util/styleCopUtil');

/* Project wide tasks. */
gulp.task('default', ['compilerDefault', 'styleCop']);

/* Runs style cop on the utilities. */
gulp.task('styleCop', ['compilerStyleCop'], function (cb) {

    var styleCop = new styleCopUtil.CordovaTools.StyleCopUtil();
    var excludedFiles = ["node.d.ts",
        "typescript.d.ts",
        "gulp.d.ts"
    ];

    styleCop.runCop('src/util', "tools/TSStyleCop/TSStyleCop.js", excludedFiles, cb);
});

module.exports = gulp;
