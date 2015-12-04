/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */


var path = require('path');
var configParser = require('./configParser');
var glob = require('glob');
var multiPlatforms = require('./platforms');
var fs = require('fs');
var nopt = require('nopt');

// Checks whether a command is compatible with livereload
// Currently, Only the following commands are compatible with LiveReload : `* (run|emulate) android -- --livereload`, `* (run|emulate) android --livereload`
//   Examples:
//     - `cordova run android -- --livereload` 
//     - `phonegap run android -- --livereload`
//     - `cordova run android --livereload`
//     - `cordova emulate android -- --livereload`
//     - `cordova emulate android --livereload`
//     - `taco emulate android --livereload`
//     - `phonegap emulate android --livereload`
module.exports.IsCmdLiveReloadCompatible = function (context) {

    // There is a bug in cordova-lib upto at least version 5.3.x that prevents the `cordova emulate` command 
    // ... from passing context object of plugins from passing the -- --livereload flag correctly.
    // ... using `isLiveReloadActive` allows us to circumvent that issue.
    var livereloadOptions = parseOptions();
    return livereloadOptions.livereload && ((livereloadOptions.run || livereloadOptions.emulate) && !isLiveReloadActivated()); // Make sure we're not already in livereload mode
};

// config.xml can be found in the projectRoot directory or within the projectRoot/www folder
module.exports.GetConfigXMLFile = GetConfigXMLFile = function (projectRoot) {
    var rootPath = path.join(projectRoot, 'config.xml');
    var wwwPath = path.join(projectRoot, 'www', 'config.xml');
    if (fs.existsSync(rootPath)) {
        return rootPath;
    } else if (fs.existsSync(wwwPath)) {
        return wwwPath;
    }
    return rootPath;
};

// Retrieve the start page for a cordova project, given the project's root directory
module.exports.GetStartPage = function (projectRoot) {
    var configXML = GetConfigXMLFile(projectRoot);
    var startPage = configParser.GetStartPage(configXML);
    return startPage;
};

module.exports.ChangeStartPage = function (projectRoot, plat, platformIndexUrl) {
    var configXmlFolder = path.join(projectRoot, 'platforms', plat, multiPlatforms.getConfigFolder(plat));
    glob.sync('**/config.xml', {
        cwd: configXmlFolder,
        ignore: '*build/**'
    }).forEach(function (filename) {
        var configXML = path.join(configXmlFolder, filename);
        configParser.ChangeStartPage(platformIndexUrl, configXML);
    });
};

// Parses LiveReload options off of process.argv
module.exports.parseOptions = parseOptions = function () {

    // --livereload and --devicesync can be used interchangeably.
    // e.g: `cordova run android -- --livereload` is the same as `cordova run android -- --devicesync`
    // Making them be the same is necessary because of two reasons:
    //    1- From TACO, we have to be able to run either `taco run ios android --devicesync` or `taco run android --livereload`
    //    2- Due to a bug in cordova-lib, we have to parse process.args and not the context. What this means is that when parsing process.args, 
    //         ... we'll see --devicesync and not --livereload. otherwise, we could have just passed the '--livereload' flag through the plugin's context from TACO.
    var knownOpts = {
        'livereload': Boolean,
        'devicesync': Boolean,
        'ignore': String,
        'tunnel': Boolean,
        'ghostMode': Boolean
    };

    var parsedOptions = nopt(knownOpts, {}, process.args, 2);
    var parsedLivereloadOptions = nopt(knownOpts, {}, parsedOptions.argv.remain, 2);

    return {
        run: parsedOptions.argv.original.indexOf('run') > -1,
        emulate: parsedOptions.argv.original.indexOf('emulate') > -1,
        livereload: parsedOptions.livereload || parsedLivereloadOptions.livereload || parsedOptions.devicesync || parsedLivereloadOptions.devicesync,
        ignore: parsedOptions.ignore || parsedLivereloadOptions.ignore,
        tunnel: parsedOptions.tunnel || parsedLivereloadOptions.tunnel,
        ghostMode: parsedOptions.ghostMode || parsedLivereloadOptions.ghostMode
    };
};

module.exports.setLiveReloadToActive = function () {
    GLOBAL.isLiveReloadActive = true;
};

module.exports.isLiveReloadActivated = isLiveReloadActivated = function () {
    return !!GLOBAL.isLiveReloadActive;
};

module.exports.isPlatformAddedToProject = function (projectRoot, platform) {
    var platformFolder = path.join(projectRoot, 'platforms', platform);
    try
    {
        return fs.statSync(platformFolder).isDirectory();
    }
    catch (err) {
        return false;
    }
};
