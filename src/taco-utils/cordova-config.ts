/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/elementtree.d.ts" />
/// <reference path="../typings/unorm.d.ts" />

import et = require("elementtree");
import fs = require("fs");
import path = require("path");
var unorm = require("unorm"); // Note no import: the compiler will remove the require since we don't use the unorm object, we just need it to add String.normalize

import tacoUtility = require("./util-helper");
import UtilHelper = tacoUtility.UtilHelper

module TacoUtility {
    export class CordovaConfig {
        /** CordovaConfig is a class for parsing the config.xml file for Cordova projects */
        private _doc: et.ElementTree;

        constructor(configXmlPath: string) {
            var contents = UtilHelper.readFileContentsSync(configXmlPath, "utf-8");
            this._doc = new et.ElementTree(et.XML(contents));
        }

        /**
         * Get the package ID
         *
         * @returns {string} The packageID
         */
        public id(): string {
            return this._doc.getroot().attrib["id"];
        }

        /**
         * Get the app's Display Name
         *
         * @returns {String} The display name, normalized to NFC
         */
        public name(): string {
            var el = this._doc.find("name");
            return el && el.text && el.text.trim().normalize();
        }

        /**
         * Get the package version
         *
         * @returns {string} The version
         */
        public version(): string {
            var el = this._doc.getroot();
            return el && el.attrib && el.attrib["version"];
        }

        /**
         * Get the preferences specified in the config
         *
         * @returns {[key: string]: string} A dictionary mapping preference keys to preference values
         */
        public preferences(): { [key: string]: string } {
            var data: { [key: string]: string } = {};
            var preferences = this._doc.findall("preference");
            preferences.forEach(function (preference: et.XMLElement): void {
                data[preference.attrib["name"]] = preference.attrib["value"];
            });

            return data;
        }
    }
}
export = TacoUtility;