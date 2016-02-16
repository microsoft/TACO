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

module.exports.isPlatformSupported = function(platform) {
    return WWW_FOLDER.hasOwnProperty(platform);
};

module.exports.getPlatformWWWFolder = function(platform) {
    return WWW_FOLDER[platform];
};
