/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/installLogLevel.d.ts" />

declare module TacoUtility {
    enum PackageSpecType {
        Error = -1,
        Version = 0,
        Uri = 1,
    }

    interface ITacoPackageLoader {
        lazyRequire<T>(packageName: string, packageId: string, logLevel?: InstallLogLevel): Q.Promise<T>;
        lazyRun(packageName: string, packageId: string, commandName: string, logLevel?: InstallLogLevel): Q.Promise<string>;
    }

    class TacoPackageLoader {
        public static GIT_URI_REGEX: RegExp;
        public static FILE_URI_REGEX: RegExp;

        public static mockForTests: TacoUtility.ITacoPackageLoader;

        /**
         * Returns a path to the specified command exported from the specified package. If the package is not already downloaded,
         * then first download and cache it locally.
         *
         * @param {string} packageName The name of the package to load
         * @param {string} packageId The version of the package to load. Either a version number such that "npm install package@version" works, or a git url to clone
         * @param {string} commandName The name of the binary to find
         * @param {LogLevel} logLevel Optional parameter which determines how much output from npm is filtered out. 
         *                  Follows the npm syntax: silent, warn, info, verbose, silly
         *                  loglevel can also be used as "pretty" in which case, only formatted taco messages like Downloading cordova@5.0 are shown
         * @returns {Q.Promise<string>} A promise which is either rejected with a failure to find the local the binary or resolved with a path to the binary
         */
        public static lazyRun(packageName: string, packageId: string, commandName: string, logLevel?: InstallLogLevel): Q.Promise<string>;

        /**
         * Load a Cordova package with specified version. If the package is not already downloaded,
         * then first download the package and cache it locally for future loads. The loaded package is cast to type T
         *
         * This method is resilient against interrupted downloads, but is not safe under concurrency.
         * Until that changes, we should not allow multiple builds at once.
         *
         * @param {string} packageVersion The version of the package to load. Either a version number such that "npm install package@version" works, or a git url to clone
         * @param {string} logLevel Optional parameter which determines how much output from npm is filtered out. 
         *                  Follows the npm syntax: silent, warn, info, verbose, silly
         *                  loglevel can also be used as "taco" in which case, only formatted taco messages like Downloading cordova@5.0 are shown
         * 
         *
         * @returns {Q.Promise<T>} A promise which is either rejected with a failure to install, or resolved with the require()'d package
         */
        public static lazyCordovaRequire<T>(cordovaCliVersion: string, logLevel?: InstallLogLevel): Q.Promise<T>;

        /**
         * Returns a path to the specified command exported from the specified Cordova package. If the package is not already downloaded,
         * then first download and cache it locally.
         *
         * @param {string} packageName The name of the package to load
         * @param {string} packageId The version of the package to load. Either a version number such that "npm install package@version" works, or a git url to clone
         * @param {string} commandName The name of the binary to find
         * @param {LogLevel} logLevel Optional parameter which determines how much output from npm is filtered out. 
         *                  Follows the npm syntax: silent, warn, info, verbose, silly
         *                  loglevel can also be used as "pretty" in which case, only formatted taco messages like Downloading cordova@5.0 are shown
         * @returns {Q.Promise<string>} A promise which is either rejected with a failure to find the local the binary or resolved with a path to the binary
         */
        public static lazyCordovaRun(cordovaCliVersion: string, logLevel?: InstallLogLevel): Q.Promise<string>;

        /**
         * Load a node package with specified version. If the package is not already downloaded,
         * then first download the package and cache it locally for future loads. The loaded package is cast to type T
         *
         * This method is resilient against interrupted downloads, but is not safe under concurrency.
         * Until that changes, we should not allow multiple builds at once.
         *
         * The second form removes any entries from the require cache that weren't present prior to the call, so any new files will be re-required if necessary.
         * However it still uses the file system cache. Use forceInstallPackage to update the file system cache if necessary.
         * 
         * @param {string} packageName The name of the package to load
         * @param {string} packageVersion The version of the package to load. Either a version number such that "npm install package@version" works, or a git url to clone
         * @param {LogLevel} logLevel Optional parameter which determines how much output from npm is filtered out. 
         *                  Follows the npm syntax: silent, warn, info, verbose, silly
         *                  loglevel can also be used as "pretty" in which case, only formatted taco messages like Downloading cordova@5.0 are shown
         *
         * @returns {Q.Promise<T>} A promise which is either rejected with a failure to install, or resolved with the require()'d package
         */
        static lazyRequire<T>(packageName: string, packageId: string, logLevel?: InstallLogLevel): Q.Promise<T>;

        /**
         * Load a taco package with specified packageKey. 
         * For development scenario, dependencyConfigPath maps a packageKey to a local folder on disk
         * For production scenario, dependencyConfigPath maps a packageKey to packageName@packageVersion or git url
         *
         * @param {string} packageKey a key to lookup in dependencyConfigPath, can be a packageName or any random string
         * @param {string} dependencyConfigPath Path to a json file which specifies key to packageId information along with other metadata like expirationIntervalInHours
         * @param {LogLevel} logLevel Optional parameter which determines how much output from npm is filtered out. 
         *                  Follows the npm syntax: silent, warn, info, verbose, silly
         *                  loglevel can also be used as "pretty" in which case, only formatted taco messages like Downloading cordova@5.0 are shown
         *
         * @returns {Q.Promise<T>} A promise which is either rejected with a failure to install, or resolved with the require()'d package
         */
        static lazyTacoRequire<T>(packageKey: string, dependencyConfigPath: string, logLevel?: InstallLogLevel): Q.Promise<T>;
    }
}
