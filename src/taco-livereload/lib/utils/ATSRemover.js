/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

var glob = require('glob');
var multiPlatforms = require('./platforms');
var plist = require('plist');
var path = require('path');
var fs = require('fs');

module.exports = function(projectRoot, platform) {

    var self = this;
    this.Remove = function() {
        var configFolder = path.join(projectRoot, 'platforms', platform, multiPlatforms.getConfigFolder(platform));
        glob.sync('**/*Info.plist', {
            cwd: configFolder,
            ignore: '*build/**'
        }).forEach(function(filename) {
            var infoPListFile = path.join(configFolder, filename);
            var data = plist.parse(fs.readFileSync(infoPListFile, 'utf-8'));
            data.NSAppTransportSecurity = {
                NSAllowsArbitraryLoads: true
            };
            fs.writeFileSync(infoPListFile, plist.build(data));
        });
    };
};

