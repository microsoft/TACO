// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

var os = require('os');

module.exports.show = function(msg) {
    var pluginName = require('../../package.json').name;
    console.log(os.EOL + pluginName + ' : ' + os.EOL + msg);
};
