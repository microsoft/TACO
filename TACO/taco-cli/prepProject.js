//boostrap project
var exec = require("child_process").exec,
    path = require('path');

console.log("************************************************************");
console.log("Preparing taco-cli project for first use.....");
console.log("Run 'gulp' in current directory to build the project.");
console.log("************************************************************\n\n");

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
            //compile root gulptfile.ts
            console.log("---compiling gulpfile.ts");
            var compileTSOutput = exec("tsc gulpfile.ts --module commonjs", { cwd: "." });
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