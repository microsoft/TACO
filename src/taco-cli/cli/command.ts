/// <reference path="../../typings/cordova.d.ts" />
import cordova = require("cordova");

module Commands {
    export interface CommandInfo {
        modulePath: string;
        description: string;
        args: any;
        options: any;
    }

    export class Command {
        info: CommandInfo;

        constructor() {
        }

        run() {
            cordova.cli(["a", "b"]);
        }
    }

    export class Platform extends Command {        
        run() {
            super.run();
        }
    }
}

export = Commands;

