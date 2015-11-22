/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

var os = require('os');

module.exports.show = function(msg) {
    var pluginName = require('../../package.json').name;
    console.log(os.EOL + pluginName + ' : ' + os.EOL + msg);
};
