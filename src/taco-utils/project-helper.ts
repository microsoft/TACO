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
    }
}

export = TacoUtility;