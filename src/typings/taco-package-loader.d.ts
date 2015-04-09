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
         * @param {string} packageName The name of the package to load
         * @param {string} packageVersion The version of the package to load. Either a version number such that "npm install package@version" works, or a git url to clone
         *
         * @returns {Q.Promise<T>} A promise which is either rejected with a failure to install, or resolved with the require()'d package
         */
        static lazyRequire<T>(packageName: string, packageVersion: string): Q.Promise<T>;
        static lazyAcquire(packageName: string, packageVersion: string): Q.Promise<any>;
        static installPackageFromNPM<T>(packageName: string, packageVersion: string, packageTargetPath: string): Q.Promise<T>;
    }
}
