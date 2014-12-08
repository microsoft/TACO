var gulp = require('gulp');
var typescript = require('gulp-typescript');
var eventStream = require('event-stream');
var concat = require('gulp-concat');
var del = require('del');

gulp.task('default', ['clean', 'compile', 'combine']);

gulp.task('compile', ['clean'], function () {
    var tsStream = gulp.src('src/*.ts')
    .pipe(typescript({}));
    
    return eventStream.merge(
        tsStream.dts.pipe(gulp.dest('release/definitions')),
        tsStream.js.pipe(gulp.dest('release/js'))
    );
});

gulp.task('combine', ['compile'], function () {
    gulp.src(['src/ts-compile-hook.js', 'release/js/tsc-invoker.js'])
        .pipe(concat('compile-typescript.js'))
        .pipe(gulp.dest('release/before_prepare'))
    return gulp.src('src/tsc-config.json')
        .pipe(gulp.dest('release/before_prepare/compile-typescript'));
});

gulp.task('clean', function (cb) {
    del(['release/**'], cb);
});

module.exports = gulp;
