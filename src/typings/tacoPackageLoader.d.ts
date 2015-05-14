/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/Q.d.ts" />
declare module TacoUtility {
    enum PackageSpecType {
        Error = -1,
        Version = 0,
        Uri = 1,
    }
    class TacoPackageLoader {
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
         * @param {string} logLevel Optional parameter which determines how much output from npm and git is filtered out. Follows the npm syntax: silent, warn, info, verbose, silly
         *
         * @returns {Q.Promise<T>} A promise which is either rejected with a failure to install, or resolved with the require()'d package
         */

        static lazyRequire<T>(packageName: string, packageVersion: string, logLevel?: string): Q.Promise<T>;
        static lazyRequireNoCache<T>(packageName: string, packageVersion: string, logLevel?: string): Q.Promise<T>;

        /**
         * Perform a fresh install of a specified node module, even if it is already cached in the file system
         *
         * This method is resilient against interrupted downloads, but is not safe under concurrency.
         * Until that changes, we should not allow multiple builds at once.
         * 
         * @param {string} packageName The name of the package to load
         * @param {string} packageVersion The version of the package to load. Either a version number such that "npm install package@version" works, or a git url to clone
         * @param {string} logLevel Optional parameter which determines how much output from npm and git is filtered out. Follows the npm syntax: silent, warn, info, verbose, silly
         *
         * @returns {Q.Promise<any>} A promise which is either rejected with a failure to install, or resolved if the package installed succesfully
         */
        static forceInstallPackage(packageName: string, packageVersion: string, logLevel?: string): Q.Promise<any>;

        /**
         * These three functions redirect to their corresponding function above after first fetching the appropriate information from the specified mapping file.
         */
        static tacoRequire<T>(packageId: string, dependencyConfigPath: string): Q.Promise<T>;
        static tacoRequireNoCache<T>(packageId: string, dependencyConfigPath: string): Q.Promise<T>;
        static forceInstallTacoPackage(packageId: string, dependencyConfigPath: string): Q.Promise<any>;
    }
}
