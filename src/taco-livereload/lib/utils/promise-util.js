/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */


var Q = require('q');

// Given a function and an array of values, creates a chain of promises that
// will sequentially execute func(args[i]).
// Returns a promise.
//
function Q_chainmap(args, func) {
    return Q.when().then(function(inValue) {
        return args.reduce(function(soFar, arg) {
            return soFar.then(function(val) {
                return func(arg, val);
            });
        }, Q(inValue));
    });
}

// Behaves similar to Q_chainmap but gracefully handles failures.
// When a promise in the chain is rejected, it will call the failureCallback and then continue the processing, instead of stopping
function Q_chainmap_graceful(args, func, failureCallback) {
    return Q.when().then(function(inValue) {
        return args.reduce(function(soFar, arg) {
            return soFar.then(function(val) {
                return func(arg, val);
            }).fail(function(err) {
                if (failureCallback) {
                    failureCallback(err);
                }
            });
        }, Q(inValue));
    });
}

exports.Q_chainmap = Q_chainmap;
exports.Q_chainmap_graceful = Q_chainmap_graceful;
