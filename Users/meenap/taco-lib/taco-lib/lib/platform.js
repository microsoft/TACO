/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";
var cordova = require('cordova');
cordova.on('results', console.info);
cordova.on('log', console.info);
cordova.on('warn', console.warn);
cordova.on('error', console.error);
cordova.on('verbose', console.info);
var platform;
(function (platform) {
    function platformCommand(command, targets, options) {
        switch (command) {
            case 'add':
                return cordova.raw.platform('add', targets, options);
                break;
            case 'rm':
            case 'remove':
                return cordova.raw.platform('remove', targets, options);
                break;
            case 'update':
            case 'up':
                return cordova.raw.platform('update', targets, options);
                break;
            case 'check':
                return cordova.raw.platform('check', targets, options);
                break;
            default:
                return cordova.raw.platform('list');
        }
    }
    platform.platformCommand = platformCommand;
})(platform || (platform = {}));
module.exports = platform;
//# sourceMappingURL=platform.js.map