var gulp = require('gulp');
var eventStream = require('event-stream');
var concat = require('gulp-concat');
var del = require('del');
var ts = require("typescript");
var fs = require("fs");
var path = require("path");

gulp.task('default', ['clean', 'compile', 'combine']);

gulp.task('compile', ['clean'], function () {

    function compile(filenames, options) {
        var host = ts.createCompilerHost(options);
        var program = ts.createProgram(filenames, options, host);
        var checker = ts.createTypeChecker(program, true);
        var result = checker.emitFiles();

        var allDiagnostics = program.getDiagnostics()
            .concat(checker.getDiagnostics())
            .concat(result.diagnostics);

        for (var i = 0; i < allDiagnostics.length; i++) {
            var sourceFile = allDiagnostics[i].file;
            var lineAndCharacter = sourceFile.getLineAndCharacterFromPosition(allDiagnostics[i].start);
            console.warn(sourceFile.filename + "(" + lineAndCharacter.line + "," + lineAndCharacter.character + "): " + allDiagnostics[i].messageText);
        }

        if (result.emitResultStatus !== 0) {
            throw "Typescript compilation failed."
        }
    }

    /**
     * Recursively finds all the typescript files under the filesRoot path.
     */
    function getProjectTypescriptFiles(filesRoot, result) {
        if (fs.existsSync(filesRoot)) {
            var files = fs.readdirSync(filesRoot);
            for (var i = 0; i < files.length; i++) {
                var currentPath = path.join(filesRoot, files[i]);
                if (!fs.statSync(currentPath).isDirectory()) {
                    /* push the typescript files */
                    if (path.extname(currentPath) === '.ts') {
                        result.push(currentPath);
                    }
                }
                else {
                    /* call the function recursively for subdirectories */
                    this.getProjectTypescriptFiles(currentPath, result);
                }
            }
        }

        return result;
    }

    var sourcefiles = getProjectTypescriptFiles('./src', []);

    compile(sourcefiles.slice(0), {
        noImplicitAny: true,
        noEmitOnError: true,
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.CommonJS,
        outDir: "./bin"
    });
});

gulp.task('combine', ['compile'], function () {
    gulp.src(['src/nodeEnv.js', 'bin/compileTypescript.js'])
        .pipe(concat('compileTypescriptNode.js'))
        .pipe(gulp.dest('bin'));
    gulp.src(['src/nodeEnv.js', 'bin/main.js'])
        .pipe(concat('tacompile'))
        .pipe(gulp.dest('bin'));
    return gulp.src('src/compileTypescriptConfig.json')
        .pipe(gulp.dest('bin'));
});

gulp.task('clean', function (cb) {
    del(['bin/**'], cb);
});

module.exports = gulp;
