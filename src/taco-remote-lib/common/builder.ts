// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/Q.d.ts" />
/// <reference path="../../typings/tacoUtils.d.ts" />
/// <reference path="../../typings/rimraf.d.ts" />
/// <reference path="../../typings/cordovaExtensions.d.ts" />
/// <reference path="../../typings/semver.d.ts" />

"use strict";

import child_process = require("child_process");
import fs = require("fs");
import path = require("path");
import Q = require("q");
import rimraf = require("rimraf");
import semver = require("semver");

import resources = require("../resources/resourceManager");
import utils = require("taco-utils");

import BuildInfo = utils.BuildInfo;
import Logger = utils.Logger;
import UtilHelper = utils.UtilHelper;

class Builder {
    protected currentBuild: BuildInfo;
    protected cordova: Cordova.ICordova;

    private static change_directory(appDir: string): void {
        process.chdir(appDir);
        // Cordova checks process.env.PWD before process.cwd()
        // so we need to update that as well.
        process.env.PWD = appDir;
        return;
    }

    constructor(currentBuild: BuildInfo, cordova: Cordova.ICordova) {
        this.currentBuild = currentBuild;
        this.cordova = cordova;

        cordova.on("results", Logger.log);
        cordova.on("log", Logger.log);
        cordova.on("warn", Logger.logWarning);
        cordova.on("error", Logger.logError);
        cordova.on("verbose", Logger.log);
    }

    public build(): Q.Promise<BuildInfo> {
        if (semver.lt(this.currentBuild["vcordova"], "5.4.0") && semver.gte(process.versions.node, "5.0.0")) {
            throw new Error(resources.getString("UnsupportedCordovaAndNode5Version"));
        }

        var isDeviceBuild: boolean = this.currentBuild.options.indexOf("--device") !== -1;
        var self: Builder = this;

        return Q.fcall(Builder.change_directory, self.currentBuild.appDir)
            .then(function(): Q.Promise<any> { return self.update_plugins(); })
            .then(function(): void { self.currentBuild.updateStatus(BuildInfo.BUILDING, "UpdatingPlatform", self.currentBuild.buildPlatform); process.send(self.currentBuild); })
            .then(function(): Q.Promise<any> { return self.beforePrepare(); })
            .then(function(): Q.Promise<any> { return self.addPlatform(); })
            .then(function(): Q.Promise<any> { return self.build_platform(); })
            .then(function(): Q.Promise<any> { return self.afterCompile(); })
            .then(function(): void { self.currentBuild.updateStatus(BuildInfo.BUILDING, "PackagingNativeApp"); process.send(self.currentBuild); })
            .then(function(): Q.Promise<any> { return isDeviceBuild ? self.package() : Q({}); })
            .then(function(): void {
                Logger.log(resources.getString("DoneBuilding", self.currentBuild.buildNumber));
                self.currentBuild.updateStatus(BuildInfo.COMPLETE);
            })
            .catch(function(err: Error | string): void {
                var errorMessage: string;

                if (typeof err === "string") {
                    errorMessage = err;
                } else {
                    errorMessage = err.message;
                }

                Logger.log(resources.getString("ErrorBuilding", self.currentBuild.buildNumber, errorMessage));
                self.currentBuild.updateStatus(BuildInfo.ERROR, "BuildFailedWithError", errorMessage);
            }).then(function(): BuildInfo {
                return self.currentBuild;
            });
    }

    protected beforePrepare(): Q.Promise<any> {
        return Q({});
    }

    protected afterCompile(): Q.Promise<any> {
        return Q({});
    }

    protected package(): Q.Promise<any> {
        return Q({});
    }

    private addPlatform(): Q.Promise<any> {
        if (!fs.existsSync("platforms")) {
            fs.mkdirSync("platforms");
        }

        return this.ensurePlatformAdded();
    }

    /**
     * Adds the platform if it isn't already present, or removes and re-adds it if the project Cordova version changed, or config.xml has a saved platform version that differs from the installed one.
     */
    private ensurePlatformAdded(): Q.Promise<any> {
        if (!fs.existsSync(path.join("platforms", this.currentBuild.buildPlatform))) {
            Logger.log("cordova platform add " + this.currentBuild.buildPlatform);

            return this.cordova.raw.platform("add", this.currentBuild.buildPlatform);
        }

        var xmlVersion: string = this.getConfigXmlPlatformVersion();
        var mustReAddPromise: Q.Promise<boolean>;

        if (xmlVersion) {
            mustReAddPromise = this.getCurrentPlatformVersion().then((currentVersion: string) => {
                if (!semver.satisfies(currentVersion, xmlVersion)) {
                    // There is a version of the platform specified in config.xml, and it differs from the installed version
                    return true;
                } else {
                    // The version specified in config.xml is already installed, we don't need to re-add the platform
                    return false;
                }
            }, (err) => {
                // If we couldn't extract the platform's version, then remove and re-add it anyway, to be safe
                return true;
            });
        } else {
            // Check if the Cordova version has changed; if it has, then we must re-add the platform
            var cordovaChanged: boolean = !!this.currentBuild["previousvcordova"] && semver.neq(this.currentBuild["vcordova"], this.currentBuild["previousvcordova"]);

            mustReAddPromise = Q(cordovaChanged);
        }

        return mustReAddPromise.then((mustReAdd: boolean) => {
            if (mustReAdd) {
                Logger.log("cordova platform remove " + this.currentBuild.buildPlatform);

                return this.cordova.raw.platform("remove", this.currentBuild.buildPlatform).then(() => {
                    Logger.log("cordova platform add " + this.currentBuild.buildPlatform);

                    return this.cordova.raw.platform("add", this.currentBuild.buildPlatform);
                });
            }
        });
    }

    private getConfigXmlPlatformVersion(): string {
        var engines = utils.CordovaConfig.getCordovaConfig(this.currentBuild.appDir).engines();

        if (engines[this.currentBuild.buildPlatform]) {
            return engines[this.currentBuild.buildPlatform];
        }

        return "";
    }

    private getCurrentPlatformVersion(): Q.Promise<string> {
        var deferred: Q.Deferred<string> = Q.defer<string>();

        child_process.exec(path.join("platforms", this.currentBuild.buildPlatform, "cordova", "version"), (err: Error, stdout: Buffer, stderr: Buffer) => {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(stdout.toString());
            }
        });

        return deferred.promise;
    }

    private update_plugins(): Q.Promise<any> {
        var remotePluginsPath: string = path.join("remote", "plugins");
        var self: Builder = this;
        if (!fs.existsSync(remotePluginsPath)) {
            return Q.resolve({});
        }

        var newAndModifiedPlugins: string[] = fs.readdirSync(remotePluginsPath).filter(function(entry: string): boolean {
            return fs.statSync(path.join(remotePluginsPath, entry)).isDirectory();
        });
        var pluginNameRegex: RegExp = new RegExp("plugins#([^#]*)#plugin.xml$".replace(/#/g, path.sep === "\\" ? "\\\\" : path.sep));
        var deletedPlugins: string[] = [];
        if (this.currentBuild.changeList && this.currentBuild.changeList.deletedFiles) {
            deletedPlugins = this.currentBuild.changeList.deletedFiles.filter(function(file: string): boolean {
                // file paths have been pre-normalised to use this platform's slashes
                // A plugin is deleted if its plugin.xml is deleted
                return !!file.match(pluginNameRegex);
            }).map(function(file: string): string {
                return file.match(pluginNameRegex)[1];
            });
        }

        var fetchJson: Cordova.IFetchJson = {};
        var fetchJsonPath: string = path.join(remotePluginsPath, "fetch.json");
        if (fs.existsSync(fetchJsonPath)) {
            try {
                fetchJson = JSON.parse(fs.readFileSync(fetchJsonPath, "utf8"));
            } catch (e) {
                // fetch.json is malformed; act as though no plugins are installed
                // If it turns out we do need variables from the fetch.json, then cordova will throw an error
                // and report exactly what variables were required.
            }
        }
        // Delete old plugins and then update new/modified plugins
        return utils.PromisesUtils.chain<string, any>(deletedPlugins, (plugin: string) => {
            // If the file doesn't exist any more, it may have been a dependent plugin that was removed
            // along with another plugin. It's not there any more at least, so lets assume it worked.
            if (!fs.existsSync(path.join("plugins", plugin))) {
                return Q.resolve({});
            }
            return self.cordova.raw.plugin("remove", plugin)
                // In the case of an error, don't stop the whole thing; report the error to the log and attempt to continue.
                // The plugin may have other plugins depending on it. If so, we are probably going to remove those later on,
                // which will then also remove this plugin
                .catch(function(err: any): void {
                    Logger.logError(err);
                });
        })
            .then(function(): Q.Promise<any> {
                return utils.PromisesUtils.chain(newAndModifiedPlugins, (plugin: string) => {
                    var newFolder: string = path.join(remotePluginsPath, plugin);
                    var installedFolder: string = path.join("plugins", plugin);
                    // The plugin is already installed; overwrite it
                    // Note that the plugin may have been installed by another plugin that depended on it;
                    // I don't know what version will have been installed then, but hopefully by
                    // overwriting it with the one that we have, we'll end up in the correct state.
                    if (fs.existsSync(installedFolder)) {
                        return UtilHelper.copyRecursive(newFolder, installedFolder);
                    }
                    // The plugin is not installed; install it
                    var cliVariables: IDictionary<string> = {};

                    // Check to see if the plugin is mentioned in fetch.json and has variables
                    if (plugin in fetchJson && fetchJson[plugin].variables) {
                        Object.keys(fetchJson[plugin].variables).forEach(function(key: string): void {
                            cliVariables[key] = fetchJson[plugin].variables[key];
                        });
                    }

                    return self.cordova.raw.plugin("add", newFolder, { cli_variables: cliVariables });
                });
            })
            .finally(function(): void {
                // Always clean up after ourselves; we don't want to get confused the next time we do a build.
                rimraf.sync(remotePluginsPath);
            })
            .then(() => {
                // Ensure that we have cordova-plugin-vs-taco-support installed
                if (semver.gte(this.currentBuild["vcordova"], "5.0.0")) {
                    return self.cordova.raw.plugin("add", "cordova-plugin-vs-taco-support");
                } else {
                    // Cordova < 5.0.0 does not support acquiring plugins from npm. Instead, get it from git
                    return self.cordova.raw.plugin("add", "https://github.com/Microsoft/cordova-plugin-vs-taco-support.git")
                }
            });
    }

    private build_platform(): Q.Promise<any> {
        Logger.log("cordova build " + this.currentBuild.buildPlatform);
        var configuration: string = (this.currentBuild.configuration === "debug") ? "--debug" : "--release";
        var opts: string[] = (this.currentBuild.options.length > 0) ? [this.currentBuild.options, configuration] : [configuration];
        return this.cordova.raw.build({ platforms: [this.currentBuild.buildPlatform], options: opts });
    }
}

export = Builder;
