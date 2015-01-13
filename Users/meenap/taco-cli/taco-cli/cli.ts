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
import tacoLib = require('taco-lib');
import nopt = require('nopt');

class CommandOptions {
    verbose: boolean;
    silent: boolean;
    browserify: boolean;
    platforms: string[];
    options: string[];

    constructor(verbose?: boolean, silent?: boolean, browserify?: boolean, platforms?: string[], options?: string[]) {
        this.verbose = verbose || false;
        this.silent = silent || false;
        this.browserify = browserify || false;
        this.platforms = platforms || [];
        this.options = options || [];
    }
}

/*class ParsedArguments {
    

    constructor(verbose?: boolean, silent?: boolean, browserify?: boolean, platforms?: string[], options?: string[]) {
        this.verbose = verbose || false;
        this.silent = silent || false;
        this.browserify = browserify || false;
        this.platforms = platforms || [];
        this.options = options || [];
    }
}*/


function printCopyright(): void {
    console.info('Tools for Apache Cordova');
    console.info('Copyright (C) 2014 Microsoft Corporation. All rights reserved.\n');
}

function printTaco(): void {
    process.stdout.write('    _______                  \n');
    process.stdout.write('   (_______)                \n');
    process.stdout.write('      | |   ___    ____   ___  \n');
    process.stdout.write('      | |  / \\ \\  / ___| / _ \\\n');
    process.stdout.write('      | | /___\\ \\ | ___ | (_) |\n');
    process.stdout.write('      |_|/ /   \\ \\ \\___| \\___/ \n');
}


function printHelp(command: string): void {
    
}

function printUsage(): void {
}



function cli(inputArguments : any[]): void {
    printCopyright();
    printTaco();

    
    // Process the input arguments
    var knownOpts =
        {
            'verbose': Boolean
            , 'version': Boolean
            , 'help': Boolean
            , 'silent': Boolean
            , 'experimental': Boolean
            , 'noregistry': Boolean
            , 'shrinkwrap': Boolean
            , 'usegit': Boolean
            , 'copy-from': String
            , 'link-to': path
            , 'searchpath': String
            , 'variable': Array
        // Flags to be passed to `cordova build/run/emulate`
            , 'debug': Boolean
            , 'release': Boolean
            , 'archs': String
            , 'device': Boolean
            , 'emulator': Boolean
            , 'target': String
            , 'browserify': Boolean
            , 'nobuild': Boolean
        };

    var shortHands =
        {
            'd': '--verbose'
            , 'v': '--version'
            , 'h': '--help'
            , 'src': '--copy-from'
        };

    // If no inputArgs given, use process.argv.
    inputArguments = inputArguments || process.argv;

    var args = nopt(knownOpts, shortHands, inputArguments);
    console.info(args);

    console.info("Number of command-line arguments - " + args.argv.remain.length);

    for (var i = 0; i < args.argv.remain.length; ++i) {
        console.info(args.argv.remain[i]);
    }

    // cordova build ios -- --verbose --whatever
    // In this case "--verbose" is not parsed by nopt and args.vergbose will be
    // false, the unparsed args after -- are kept in unparsedArgs and can be
    // passed downstream to some scripts invoked by Cordova.
    var optionsList = [];
    var commandArgsEndIndex = args.argv.original.indexOf('--');
    if (commandArgsEndIndex != -1) {
        optionsList = args.argv.original.slice(commandArgsEndIndex + 1);
    }

    // args.argv.remain contains both the params args (like platform names)
    // and whatever unparsed args that were protected by " -- ".
    // "params" stores only the params args without those after " -- " .
    var remain = args.argv.remain;
    var params = remain.slice(0, remain.length - optionsList.length);
    var cmd = params[0];

    console.info("The command is :" + cmd);

    var subcommand;
    var msg;
    //var known_platforms = Object.keys(tacoLib.cordova_platforms);

    if (!cmd || cmd == 'help' || args.help) {
        if (!args.help && remain[0] == 'help') {
            remain.shift();
        }
        return printHelp(remain);
    }

    var options: CommandOptions;
    var task = tasks[cmd];
    if (task) {
        Q(task.execute(params, options)).done();
    } else {
        console.info("Exiting TACO...");
        process.exit(0);
    }
}

var tasks: {
    [key: string]: { execute(params: string, settings: CommandOptions): Q.IPromise<any>; }
};
    tasks = {
        'create': {
            execute: function (params: string, settings: CommandOptions) {
                console.info("TACO : Creating project...");
                
                /*var cfg = {};
                // If we got a fourth parameter, consider it to be JSON to init the config.
                if (params[4]) {
                    cfg = JSON.parse(params[4]);
                }
                var customWww = args['copy-from'] || args['link-to'];
                if (customWww) {
                    if (customWww.indexOf('http') === 0) {
                       // throw error here
                    }
                    if (customWww.substr(0, 1) === '~') {  // resolve tilde in a naive way.
                        customWww = path.join(process.env.HOME, customWww.substr(1));
                    }
                    customWww = path.resolve(customWww);
                    var wwwCfg = { url: customWww };
                    if (args['link-to']) {
                        wwwCfg.link = true;
                    }
                    cfg.lib = cfg.lib || {};
                    cfg.lib.www = wwwCfg;
                }*/

                return tacoLib.create(params[1], params[2], params[3], params[4]);
            }
        },
        'build': {
            execute: function (params: string, settings: CommandOptions) {
                return tacoLib.build(settings.options);
            }
        },
        'platform': {
            execute: function (params: string, settings: CommandOptions) {
                return tacoLib.platform(params[1], params[2], settings.options);
            }
        },
        'compile': {
            execute: function (params: string, settings: CommandOptions) {
                return tacoLib.compile(settings.options);
            }
        },

        'prepare': {
            execute: function (params: string, settings: CommandOptions) {
                return tacoLib.prepare(settings.options);
            }
        },

        'run': {
            execute: function (params: string, settings: CommandOptions) {
                return tacoLib.run(settings.options);
            }
        },

        'emulate': {
            execute: function (params: string, settings: CommandOptions) {
                return tacoLib.emulate(settings.options);
            }
        },

}

export = cli;