/// <reference path="../../../typings/wrench.d.ts" />
/// <reference path="../../../typings/replace.d.ts" />
/// <reference path="../../../typings/tar.d.ts" />

"use strict";
import Q = require ("q");
import path = require ("path");
import fs = require ("fs");
import zlib = require ("zlib");
import wrench = require ("wrench");
import tar = require ("tar");
import replace = require ("replace");
import tacoUtility = require ("taco-utils");
import logger = tacoUtility.Logger;
import resources = tacoUtility.ResourcesManager;
import utils = tacoUtility.UtilHelper;
import cordovaWrapper = require ("./cordova-wrapper");

module KitUpdater {
    export class KitUpdater {
        /*
         * This module and all the exported utility classes is responsible to make sure that the TACO commandline utility
         * 
         * is working with the latest version of the Kits (taco-kits) that is available in npm. 
         */
       
}


}

export = KitUpdater;