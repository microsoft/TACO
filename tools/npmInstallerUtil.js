var exec = require("child_process").exec;
var fs = require("fs");
var path = require("path");

/**
 * Utility for installing npm packages asynchronously.
 */
function installPackage(pkg, installRoot, callback) {
    if (isPackageInstalled(pkg)) {
        callback();
    }
    else {
        console.info("Installing "+pkg);
        exec("npm install " + pkg, { cwd: installRoot }, function (error, stdout, stderr) {
            callback(error);
        });
    }
};

function uninstallPackage(pkg, installRoot, callback) {
    console.info("Uninstalling " + pkg);
    exec("npm uninstall " + pkg, { cwd: installRoot }, function (error, stdout, stderr) {
        callback(error);
    });
};

function isPackageInstalled (pkg) {
    try {
        require(pkg);
        return true;
    } catch (e) {
    }
    return false;
};

function executePackageAction(modules, installRoot, callback, action) {
    var asyncLoop = function (idx) {
        if (idx < modules.length) {
            action(modules[idx], installRoot, function (error) {
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
}

module.exports.installPackages = function (modules, installRoot, callback) {
    executePackageAction(modules, installRoot, callback, installPackage);
};
module.exports.uninstallPackages = function (modules, installRoot, callback) {
    executePackageAction(modules, installRoot, callback, uninstallPackage);
};
