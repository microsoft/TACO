
var exec = require("child_process").exec;
var fs = require("fs");
var path = require ("path");
var util = require("util");

var buildConfig = require('./build_config.json');

switch(process.env.npm_lifecycle_event){
    case "clean":
        cleanBuild();
        break;
    case "rebuild":
    case "postinstall":
        compileBuildScripts();
        break;
    default:
        console.error("Error: script called in unknown stage "+process.env.npm_lifecycle_event);
        break;
}

function compileBuildScripts() {
    console.log("Compiling TACO build tools...\n");
    var gulp = require("gulp");
    var ts = require('gulp-typescript');
    var sourcemaps = require("gulp-sourcemaps");
    gulp.src(["tools/**/*.ts"])
        .pipe(sourcemaps.init())
        .pipe(ts(buildConfig.tsCompileOptions))
        .on("error", function(error){
            if (error) {
                console.error("Failed: Compilation of TACO build tools failed.");
                process.exit(1);
            }
        })
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest(path.resolve(buildConfig.buildTools)))
        .on("end", function(){
            // copy over build config to build\tools
            // this is needed to make sure compile gulp scripts have same path to build_config
            fs.writeFileSync(path.resolve(buildConfig.buildTools, "build_config.json"), JSON.stringify(buildConfig));
            console.log(greenColorFunction("Success!!! To build the project, run 'gulp' from TACO root directory"));
        });
}

function cleanBuild() {
    deleteFolderRecursive(buildConfig.buildTools);

    var devDependencies = [];
    if (fs.existsSync("node_modules")){
        devDependencies = fs.readdirSync("node_modules").filter(function(file){
            return fs.lstatSync(path.join("node_modules", file)).isDirectory() && 
                    file !== ".bin";
        });
    }

    var asyncLoop = function (idx) {
        if (idx < devDependencies.length) {
            var pkg = devDependencies[idx];
            console.info("Uninstalling " + pkg);
            exec("npm uninstall " + pkg, {}, function (error, stdout, stderr) {
                if (!error) {
                    asyncLoop(idx + 1);
                }
                else {
                    if (error){
                        console.error(util.format("Failed: 'npm uninstall %s'. Error: error", pkg, error));
                        process.exit(1);
                    }
                }
            });
        }
    };
    asyncLoop(0);
}

function deleteFolderRecursive (dirPath) {
    if(fs.existsSync(dirPath)) {
        console.log("Removing "+dirPath);
        fs.readdirSync(dirPath).forEach(function(file){
            var curPath = path.join(dirPath, file);
            // recurse
            if(fs.lstatSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath);
            } else { 
                // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(dirPath);
    }
};

function greenColorFunction(s) {
    // https://en.wikipedia.org/wiki/ANSI_escape_code#CSI_codes
    // \u001b[3Xm == "set foreground colour to colour in slot X"
    // Slot 2 defaults to green
    // \u001b[39m == "reset foreground colour"
    // \u001b[1m == "bold" which is interpreted differently by different terminals
    // \u001b[22m == "stop being bold (or faint)"
    return "\u001b[32m\u001b[1m" + s + "\u001b[22m\u001b[39m";
}