/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */


var path = require('path');
var Q = require('q');
var fs = require('fs');
var url = require('url');
var logger = require('./utils/logger');
var helpers = require('./utils/helpers');
var merge = require('lodash.merge');

var projectRoot;

/**
 * @constructor
 * @param {string} projectRoot - root folder of the project
 * @param {Object} options - Options to initialize LiveReload with - These are to be passed to the underlying BrowserSync.
 *                           See http://www.browsersync.io/docs/options/ for documentation
 */

function BrowserSyncServer(projectRoot, options) {
    this.projectRoot = projectRoot;
    this.options = options;
    this.browserSync = require('browser-sync').create(); 
};


BrowserSyncServer.prototype.startServer = function () {
    var self = this;
    var deferred = Q.defer();

    var defaultOptions = {
        server: {
            baseDir: self.projectRoot,
            directory: true
        },
        open: false,

        // Note: Do not override 'fn'. If fn is overriden by another option, multi-device scenario 
        // ... will be lost due to 'monkey patching' going away
        snippetOptions: {
            rule: {
                match: /<\/body>/i,
                fn: function (snippet, match) {
                    return monkeyPatch() + snippet + match;
                }
            }
        },
        minify: false,
        ghostMode: true
    };


    // User provided options take precedence over the default ones
    self.options = merge(defaultOptions, self.options);

    // Initialize the browser-sync instance
    self.browserSync.init(self.options, function (err, bs) {

        // Once BrowserSync is ready, resolve the promise
        if (err) {
            deferred.reject(err);
            return;
        }

        var serverUrls = bs.options.getIn(['urls']);
        deferred.resolve(serverUrls.toJS());
        return;
    });

    return deferred.promise;
};

// Reloads all the connected browsers
BrowserSyncServer.prototype.reloadBrowsers = function () {
    this.browserSync.reload();
};

// Either reloads the whole file (e.g: html)
// ... or injects changes into the file (e.g: css)
// ... the strategy used depends on the file type
BrowserSyncServer.prototype.tryReloadingFile = function (file) {
    this.browserSync.reload(file);
};

// Stops the browsersync server
BrowserSyncServer.prototype.stopServer = function () {
    this.browserSync.exit();
};


/**
 * Private function that adds the code snippet to deal with reloading
 * files when they are served from platform folders
 * This is necessary to allow clicks & scrolls (one of BrowserSync's functionalities) to function well across
 *    different platforms (e.g: IOS and Android)
 */
function monkeyPatch() {
    var script = function () {
        window.__karma__ = true;
        (function patch() {
            if (typeof window.__bs === 'undefined') {
                window.setTimeout(patch, 500);
            } else {
                var oldCanSync = window.__bs.prototype.canSync;
                window.__bs.prototype.canSync = function (data, optPath) {
                    data.url = window.location.pathname.substr(0, window.location.pathname.indexOf('/www')) + data.url.substr(data.url.indexOf('/www'));
                    return oldCanSync.apply(this, [data, optPath]);
                };
            }
        } ());
    };
    return '<script>(' + script.toString() + '());</script>';
}


module.exports = BrowserSyncServer;
