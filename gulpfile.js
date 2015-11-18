/* placeholder gulpfile, allows calling gulpmain tasks */
var fs = require("fs"),
    path = require('path'),
    gulp = require("gulp"),
    buildConfig = require('./tools/build_config.json');

gulp.on("task_not_found", function (err) {
    console.error("\nPlease run 'npm install' from project root\n");
});

/*  
 To add additional gulp tasks, add gulpfile in folder and reference it below
 for example:  require('./src/compile/gulpfile');
*/
var gulpMain = path.resolve(buildConfig.buildTools, "gulpmain.js");
if (fs.existsSync(gulpMain)) {
    require(gulpMain);
}

module.exports = gulp;
