/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/nopt.d.ts" />
/// <reference path="../typings/mkdirp.d.ts"/>
/// <reference path="../typings/ncp.d.ts"/>

"use strict";
import child_process = require ("child_process");
import fs = require ("fs");
import mkdirp = require ("mkdirp");
import ncp = require ("ncp");
import nopt = require ("nopt");
import os = require ("os");
import path = require ("path");
import Q = require("q");

module TacoUtility {
    export class ProjectHelper {
        /**
         * This utility class is responsible for providing project-specific utility functions like
         *
         * 1. Creating the taco.json file with appropriate info regarding the kit/cli version AFTER the project is created with the "create" command
         *
         * 2. Parsing and providing info regarding the kit/cli version used for the current project BEFORE any taco command other than create is invoked
         * 
         * The idea in for the CordovaWrapper to call into the ProjectHelper APIs to know the cordova version that need to be used to execute a
         * 
         * a command.
         */
        /*public static createTacoJsonFile(defaultKidId: string, isKitProject?: boolean, kitId?: string, cli?: string): Q.Promise<any>{
            var jsonData: { [obj: string]: string };
            if (isKitProject) {
                if (kitId) {
                    kitHelper.getDefaultKit().then(function (kitId): void {
                        this.commandParameters.kitId = kitId;
                        jsonData = { 'kit': kitId };
                    });
                }
                else {
                    jsonData = { 'kit': this.commandParameters.kitId };
                }
            } else {
                if (!this.commandParameters.cordovaCli) {
                    logger.log(resources.getString("command.create.tacoJsonFileCreationError"), logger.Level.Error);
                    return;
                }
                jsonData = { 'cli': this.commandParameters.cordovaCli };
            }
            var tacoJsonPath: string = path.resolve(this.commandParameters.projectPath, "taco.json");
            fs.closeSync(fs.openSync(tacoJsonPath, 'w'));
            fs.writeFileSync(tacoJsonPath, JSON.stringify(jsonData), { 'flags': 'w' });
        }*/
    }
}

export = TacoUtility;