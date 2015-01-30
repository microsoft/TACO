///<reference path="../../typings/taco-utility.d.ts"/>
///<reference path="../../typings/node.d.ts"/>
///<reference path="../../typings/nopt.d.ts"/>

import tacoUtility = require("taco-utility");
import nopt = require("nopt");
import path = require("path");


class Taco {
    tacoResources: tacoUtility.Resources;
    constructor() {
        this.tacoResources = new tacoUtility.Resources("abc");
    }
    run(): void {
        console.log(this.tacoResources.getString("usage"));
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
        var inputArguments: string[] = process.argv;

        var args = nopt.nopt(knownOpts, shortHands, inputArguments);
        console.info(args);

        console.info("Number of command-line arguments - " + args.argv.remain.length);

        for (var i = 0; i < args.argv.remain.length; ++i) {
            console.info(args.argv.remain[i]);
        }

    }
}


var taco = new Taco();
taco.run();