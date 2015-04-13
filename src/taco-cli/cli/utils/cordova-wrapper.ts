import child_process = require ("child_process");
import Q = require("q");
import path = require("path");
import tacoUtility = require("taco-utils");
import utils = tacoUtility.UtilHelper;
import packageLoader = tacoUtility.TacoPackageLoader;

class CordovaWrapper {
    public static cli(args: string[], cordovaCliPath?: string): Q.Promise<any> {
        var deferred = Q.defer();
        var cordovaCli = cordovaCliPath ? "cordova" : path.resolve(cordovaCliPath, "bin", "cordova.cmd");
        var proc = child_process.exec([cordovaCli].concat(args).join(" "), function (err: Error, stdout: Buffer, stderr: Buffer): void {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve({ stdout: stdout, stderr: stderr });
            }
        });
        return deferred.promise;
    }

    public static build(platform: string): Q.Promise<any> {
        return CordovaWrapper.cli(["build", platform]);
    }

    /**
     * Wrapper for 'cordova create' command.
     *
     * @param {string} The ID of the kit to use
     * @param {string} The path of the project to create
     * @param {string} The id of the app
     * @param {string} The name of app
     * @param {string} A JSON string whose key/value pairs will be added to the cordova config file in <project path>/.cordova/
     * @param {[option: string]: any} Bag of option flags for the 'cordova create' command
     *
     * @return {Q.Promise<any>} An empty promise
     */
    public static create(cordovaCli: string, projectPath: string, id?: string, name?: string, cdvConfig?: string, options?: { [option: string]: any }): Q.Promise<any> {
        var deferred = Q.defer();
        //var command = ["node", __dirname];
        var command = ["create"];
        //command.push("create");

        if (projectPath) {
            command.push(projectPath);
        }

        if (id) {
            command.push(id);
        }

        if (name) {
            command.push(name);
        }
        if (cdvConfig) {
            command.push(cdvConfig);
        }

        // Add options to the command
        for (var option in options) {
            command.push("--" + option);

            // If the property has a value that isn't boolean, also include its value in the command
            if (options[option] && typeof options[option] !== "Boolean") {
                command.push(options[option]);
            }
        }
        try {
            var cordovaCliPath: any;
            /*return packageLoader.lazyRequire("cordova", cordovaCli).then(function (cordovaModule): void {
                cordova = cordovaModule;
                if (cordova.cordova_lib) {
                    return cordova.cli(command);
                }
            });*/
            return packageLoader.lazyAcquire("cordova", cordovaCli).then(function (cordovaCliPath): void {
                var cordova = require(cordovaCliPath);
                if (cordova) {
                    CordovaWrapper.cli(command, cordovaCliPath);
                    deferred.resolve(cordovaCliPath);
                }
            });
        }
        catch (e) {
            console.log(e);
            deferred.reject({});
            // Rethrow and log error
        }
        return deferred.promise;
    }
}

export = CordovaWrapper;