/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import fs = require('fs');
import nconf = require('nconf');
import path = require('path');
import Q = require('q');

import OSSpecifics = require('./OSSpecifics');
import resources = require('./resources');
import server = require('./server');

var osSpecifics = OSSpecifics.osSpecifics;

module VsMdaRemoteCli {

    export function cli() {
        console.info('vs-mda-remote');
        console.info('Copyright (C) 2014 Microsoft Corporation. All rights reserved.');
        console.info(require('../package').version);
        console.info('');

        // Configuration preference: command line, then anything in a config file if specified by the --config arg, then some defaults for options not yet set
        nconf.argv();
        if (nconf.get('v') || nconf.get('version')) {
            process.exit(0);
        }
        if (nconf.get('config')) {
            nconf.file({ file: nconf.get('config') });
        };
        var defaults: any = {
            'port': 3000,
            'maxBuildsInQueue': 10,
            'maxBuildsToKeep': 20,
            'deleteBuildsOnShutdown': true,
            'secure': true,
            'pinTimeout': 10,
            'serverDir': null,
        };

        defaults = osSpecifics.defaults(defaults);
        nconf.defaults(defaults);
        // Initialize localization resources
        resources.init();

        if (nconf.get('help') || nconf.get('h') || nconf.get('?') || !nconf.get('serverDir')) {
            osSpecifics.printUsage(nconf.get('lang'));
            process.exit(0);
        }

        var commands = nconf.get('_');
        var command : string = commands && commands.length > 0 ? commands[0] : 'start';

        var task = tasks[command];
        if (task) {
            Q(task.execute()).done();
        } else {
            console.info(resources.getString(nconf.get('lang'), 'UnknownCommand'), command);
            osSpecifics.printUsage(nconf.get('lang'));
            process.exit(0);
        }
    }

    var tasks: { [key: string]: { execute(): Q.IPromise<any>; } };
    tasks = {
        'start': {
            execute: function () {
                return osSpecifics.initialize()
                    .then(function () { server.start(nconf) });
            }
        },
        'resetServerCert': {
            execute: function () {
                return server.resetServerCert(nconf);
            }
        },
        'generateClientCert': {
            execute: function() {
                return server.generateClientCert(nconf);
            }
        }
    }

}

export = VsMdaRemoteCli