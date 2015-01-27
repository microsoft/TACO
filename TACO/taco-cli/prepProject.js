//boostrap project

var exec = require("child_process").exec,
    fs = require("fs");
    path = require('path');

console.log("************************************************************");
console.log("Preparing taco-cli project for first use.....");
console.log("Run 'gulp' in ./bin/taco-cli/taco-cli to build the project.");
console.log("************************************************************\n\n");

//delete folder recursively
var deleteFolderRecursive = function (path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file, index) {
            var curPath = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};


var run = function () {
    if (fs.existsSync("bin")) {
        console.log("---removing bin folder")
        deleteFolderRecursive("bin")
    }

    //compile root gulptfile.ts
    var compileMainGulp = function () {
        var gulpJS = "./bin/taco-cli/taco-cli/gulpfile.js";
        exec("tsc gulpfile.ts --outdir bin/taco-cli --module commonjs", { cwd: "." }, function (error, stdout, stderr) {
            if (fs.existsSync(gulpJS)) {
                console.log("---compiled " + gulpJS);
            }
        });
    };

    var installGlobalPackage = function (packageName) {
        packageCommand = "npm ls -g " + packageName;
        var result = exec(packageCommand, function (error, stdout, stderr) {
            if (stdout.indexOf(packageName) > -1) {
                console.log("---found '" + packageName + "' installed globally");
            } else {
                console.log("---did not find " + packageName + " installed globally, installing.....")
                exec("npm install -g " + packageName);
            }

            if (packageName == "typescript") {
                compileMainGulp();
            }
        });


    };

    //install global packages
    installGlobalPackage("typescript");


    ////npm install on relevant folders
    var foldersToPrep = ["."];

    foldersToPrep.forEach(function (folder) {
        console.log("---NPM install on folder:  " + path.resolve(folder));
        var npmProcess = exec("npm install", { cwd: folder }, function (error, stdout, stderr) { compileMainGulp() });
    });



    installGlobalPackage("gulp");
};

run();