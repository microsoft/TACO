/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

declare module TacoUtility {
    class CordovaConfig {
        /** CordovaConfig is a class for parsing the config.xml file for Cordova projects */
        private doc;
        constructor(configXmlPath: string);
        /**
         * Helper method to get a CordovaConfig object for a cordova project
         */
        static getCordovaConfig(cordovaDirPath: string): CordovaConfig;
        /**
         * Get the package ID
         *
         * @returns {string} The packageID
         */
        id(): string;
        /**
         * Get the app's Display Name
         *
         * @returns {String} The display name, normalized to NFC
         */
        name(): string;
        /**
         * Get the package version
         *
         * @returns {string} The version
         */
        version(): string;
        /**
         * Get the preferences specified in the config
         *
         * @returns {[key: string]: string} A dictionary mapping preference keys to preference values
         */
        preferences(): {
            [key: string]: string;
        };
        /**
         * Get the engines specified in the config
         *
         * @returns {[key: string]: string} A dictionary mapping engine keys to spec values
         */
        public engines(): { [key: string]: string };
    }
}
