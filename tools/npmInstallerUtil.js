var exec = require("child_process").exec;
var fs = require("fs");
var path = require("path");

/**
 * Utility for installing npm packages asynchronously.
 */
function installPackage(pkg, callback, force) {
    if (!force && isPackageInstalled(pkg)) {
        callback();
    }
    else {
        console.info("Installing "+pkg);
        exec("npm install " + pkg, { cwd: ".." } , function (error, stdout, stderr) {
            callback(error);
        });
    }
};

function isPackageInstalled (pkg) {
    try {
        // for folder based pkg names, look up package.name
        if (fs.existsSync(pkg)) {
            var pkgJson = path.join(pkg, "package.json");
            if (fs.existsSync(pkgJson)) {
                pkg = require(pkgJson).name;
            }
        }
        require(pkg);
        return true;
    } catch (e) {
    }
    return false;
};

module.exports.installPackages = function (modules, callback, force) {
    var asyncLoop = function (idx) {
        if (idx < modules.length) {
            installPackage(modules[idx], function (error) {
                if (!error) {
                    asyncLoop(idx + 1);
                }
                else {
                    callback(error);
                }
            }, force);
        }
        else {
            callback();
        }
        ;
    };
    asyncLoop(0);
};
