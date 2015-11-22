/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

var WWW_FOLDER = {
    android: 'platforms/android/assets/www',
    ios: 'platforms/ios/www'
};

// config.xml locations,
// These are relative to the platform folder. e.g: for Android, it's '/home/omefire/Projects/cordovaApp/platforms/android/res/xml'
var CONFIG_LOCATION = {
    android: 'res/xml',
    ios: '.'
};


module.exports.isPlatformSupported = function(platform) {
    return WWW_FOLDER.hasOwnProperty(platform) && CONFIG_LOCATION.hasOwnProperty(platform);
};

module.exports.getPlatformWWWFolder = function(platform) {
    return WWW_FOLDER[platform];
};

module.exports.getConfigFolder = function(platform) {
    return CONFIG_LOCATION[platform];
};
