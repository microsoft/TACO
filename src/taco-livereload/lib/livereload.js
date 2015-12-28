/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

var Q = require('q');
var path = require('path');
var multiPlatforms = require('./utils/platforms');
var helpers = require('./utils/helpers');
var Patcher = require('./utils/Patcher');
var livereloadEvents = require('./utils/events');

/** This file is exposed externally */


/** Start the BrowserSync server and start livereloading
 *  @param {string} projectRoot - The root of the cordova project being dealt with.
 *  @param {Array.<string[]>} platforms - The platforms we want to livereload.
 *  @param options - Options
 *  @param options.ignore - files to ignore.
 *  @param options.tunnel - use the --tunnel option to get around firewall/proxy issues.
 *  @param options.ghostMode - sync gestures (form inputs, clicks, scrolls) across multiple devices.
 *  @param options.cb - callback function to be called when a change(file modification/addition/deletion) occurs.
 */
module.exports.start = function (projectRoot, platforms, options) {

    return Q().then(function () {

        // Check if all the platforms we are trying to livereload have been added to the project        
        var areAllPlatformsAddedToProject = platforms.every(function (plat) {
            return helpers.isPlatformAddedToProject(projectRoot, plat);
        });

        if (!areAllPlatformsAddedToProject) {
            var msg = 'Some platforms specified to be livereloaded are not added to the project. Please, add them.';
            livereloadEvents.emit('livereload:error', msg);
            return Q.reject(msg);
        }
    
        // Validate whether all platforms are currently supported
        // If a platform is not supported by the plugin, display an error message and don't process it any further
        platforms.forEach(function (plat, index, platforms) {
            if (!multiPlatforms.isPlatformSupported(plat)) {
                var msg = 'The "' + plat + '" platform is not supported.';
                livereloadEvents.emit('livereload:warning', msg);
                platforms.splice(index, 1);
            }
        });

        // If none of the supplied platforms are supported, stop and return an error
        if (platforms.length === 0) {
            var msg = 'None of the platforms supplied are currently supported for LiveReload.';
            livereloadEvents.emit('livereload:error', msg);
            return Q.reject(msg);
        }

        var BrowserSyncServer = require('./browserSyncServer');
        
        // If user has entered whitespaces surrounding '--ignore', 
        // ... we end up having helpers.parseOptions() return 'ignore' with value true instead of a string,
        // ... which can't be used as a string. So, Let's check for those cases
        // e.g of error cases: 
        //      `cordova run android -- --livereload --ignore, // with no path to ignore
        //      `cordova run android -- --livereload --ignore= css, // with space after the '=' sign
        //      etc...
        // ToDO: https://github.com/Microsoft/TACO/issues/190 : ignore whitespaces surrounding the --ignore option or at least display a warning message to user
        var ignoreOption = undefined;
        if (options.ignore) {
            ignoreOption = path.join(projectRoot, 'www', options.ignore);
        }
 
        var bs = new BrowserSyncServer(projectRoot, {
            files: [{
                match: [path.join(projectRoot, 'www', '**/*.*')],
                fn: function (event, file) {
                
                    // This is used by external clients (consumers of this npm package)
                    var externalAPI = {
                        stop: bs.stopServer,
                        reloadBrowsers: bs.reloadBrowsers,
                        tryReloadingFile: bs.tryReloadingFile,
                        browserSync: bs.browserSync
                    };

                    return Q().then(function () {
                        options.cb(event, file, externalAPI);
                        return Q();
                    }).fail(function (err) {
                        livereloadEvents.emit('livereload:error', err);
                        return Q.reject(err);
                    });
                }
            }],
            watchOptions: {

                // If user specified files/folders to ignore (via `cordova run android -- --livereload --ignore=build/**/*.*`), ignore those files
                // ... Otherwise, don't ignore any files (That's the default). The function below achieves that goal.
                ignored: ignoreOption || function (str) {
                    return false; 
                },

                // Ignore the initial add events .
                // Don't run prepare on the initial addition of files,
                // Only do it on subsequent ones
                ignoreInitial: true
            },
            tunnel: options.tunnel || false,
            ghostMode: options.ghostMode || true
        });
        
        return bs.startServer().then(function (serverUrls) {
            var patcher = new Patcher(projectRoot, platforms);
            return patcher.patch(serverUrls);
        }).then(function () {
            // LiveReload is up and running
            return helpers.setLiveReloadToActive();
        }).fail(function (err) {
            livereloadEvents.emit('livereload:error', err);
            if (bs) {
                bs.stopServer();
            }
            return Q.reject(err);
        });
    }).fail(function (err) {
        livereloadEvents.emit('livereload:error', err);
        return Q.reject(err);
    });
};
