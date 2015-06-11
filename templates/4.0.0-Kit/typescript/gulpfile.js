var gulp = require("gulp");
var ts = require("gulp-typescript");

var proj = ts.createProject("scripts/tsconfig.json");

gulp.task("default", ["typescript"]);

gulp.task("typescript", function (callback) {
    var result = gulp.src("scripts/**/*.ts").pipe(ts(proj));

    return result.js.pipe(gulp.dest("www/scripts"));
});
