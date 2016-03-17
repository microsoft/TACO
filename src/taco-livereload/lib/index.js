// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/** This file is exposed externally */

var livereload = require('./livereload');
var helpers = require('./utils/helpers');

module.exports = livereload;
module.exports.Patcher = require('./utils/Patcher');
module.exports.on = function () {
	var livereloadEvents = require('./utils/events');
	livereloadEvents.on.apply(livereloadEvents, arguments);
};
module.exports.isLiveReloadActive = function() {
	return helpers.isLiveReloadActivated();
};
