//boostrap project
var exec = require("child_process").exec,
    path = require('path');


var installGlobalPackage = function (packageName) {
    packageCommand = "npm ls -g " + packageName;
    var result = exec(packageCommand, function (error, stdout, stderr) {
        if (stdout.indexOf(packageName) > -1) {
            console.log("---found gulp installed globally");
        } else {
            console.log("---did not find " + packageName + " installed globally, installing.....")
            exec("npm install -g " + packageName);
        }
    });

    
};

//install global packages
installGlobalPackage("typescript");
installGlobalPackage("gulp");

////npm install on relevant folders
var foldersToPrep = [".",
        "../utility"
];

foldersToPrep.forEach(function (folder) {
    console.log("---NPM install on folder:  " + path.resolve(folder));
    var npmProcess = exec("npm install", { cwd: folder });
});

//compile root gulptfile.ts
console.log("compiling gulpfile.ts");
var compileTSOutput = exec("tsc gulpfile.ts --module", { cwd: "." }).output;

console.log("\n\nDone, run 'gulp' to build the project");