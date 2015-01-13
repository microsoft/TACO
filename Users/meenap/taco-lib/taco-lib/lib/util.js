var util;
(function (util) {
    function addModuleProperty(module, symbol, modulePath, opt_wrap) {
        var val = null;
        if (opt_wrap) {
            module.exports[symbol] = function () {
                val = val || module.require(modulePath);
                if (arguments.length && typeof arguments[arguments.length - 1] === 'function') {
                    // If args exist and the last one is a function, it's the callback.
                    var args = Array.prototype.slice.call(arguments);
                    var cb = args.pop();
                    val.apply(module.exports, args).done(function (result) {
                        cb(undefined, result);
                    }, cb);
                }
                else {
                    val.apply(module.exports, arguments).done(null, function (err) {
                        throw err;
                    });
                }
            };
        }
    }
    util.addModuleProperty = addModuleProperty;
})(util || (util = {}));
module.exports = util;
//# sourceMappingURL=util.js.map