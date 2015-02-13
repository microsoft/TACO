var exec = require("child_process").exec;
var fs = require("fs");
var path = require("path");

/**
 * Utility for installing npm packages asynchronously.
 */
function installPackage(pkg, callback) {
    if (isPackageInstalled(pkg)) {
        callback();
    }
    else {
        console.info("Installing "+pkg);
        exec("npm install " + pkg, { cwd: ".." }, function (error, stdout, stderr) {
            callback(error);
        });
    }
};

function isPackageInstalled  (pkg) {
    var pkgJsonPath = path.join(pkg, "package.json");
    if (pkg.indexOf(path.sep) > -1 && fs.existsSync(pkgJsonPath)) {
        var pkgJson = require(pkgJsonPath);
        return isPackageInstalled(pkgJson.name);
    }
    else {
        return fs.existsSync(path.join("../node_modules", pkg));
    }
};

module.exports.installPackages = function (modules, callback) {
    var asyncLoop = function (idx) {
        if (idx < modules.length) {
            installPackage(modules[idx], function (error) {
                if (!error) {
                    asyncLoop(idx + 1);
                }
                else {
                    callback(error);
                }
            });
        }
        else {
            callback();
        }
        ;
    };
    asyncLoop(0);
};
