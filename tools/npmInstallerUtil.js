var exec = require("child_process").exec;

/**
 * Utility for installing npm packages asynchronously.
 */
function uninstallPackage(pkg, installRoot, callback) {
    console.info("Uninstalling " + pkg);
    exec("npm uninstall " + pkg, { cwd: installRoot }, function (error, stdout, stderr) {
        callback(error);
    });
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

module.exports.uninstallPackages = function (modules, installRoot, callback) {
    executePackageAction(modules, installRoot, callback, uninstallPackage);
};
