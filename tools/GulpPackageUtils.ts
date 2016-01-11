/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */
/// <reference path="../src/typings/dynamicDependencyEntry.d.ts" />
/// <reference path="../src/typings/node.d.ts" />
/// <reference path="../src/typings/Q.d.ts" />
/// <reference path="../src/typings/gulp-json-editor.d.ts" />

import child_process = require ("child_process");
import fs = require ("fs");
import gulp = require ("gulp");
import jsonEditor = require ("gulp-json-editor");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import util = require ("util");

import GulpUtils = require ("../tools/GulpUtils");

interface IPackageJson {
    version: string;
    dependencies: { [key: string]: string };
    optionalDependencies: { [key: string]: string };
    devDependencies: { [key: string]: string };
}

interface IDynamicDependenicesJson {
    [packageKey: string]: IDynamicDependencyEntry;
}

class GulpPackageUtils {

    public static package(srcPath: string, tacoModules: string[], buildType: string, destPath: string): Q.Promise<any> {

        return Q.all([
            GulpPackageUtils.updateInternalDependencies(srcPath, tacoModules, buildType, destPath),
            GulpPackageUtils.updateDynamicDependencies(srcPath, buildType, destPath)
        ])
            .then(function(): Q.Promise<any> {
                // npm pack each folder, put the tgz in the parent folder
                return GulpPackageUtils.packageModules(srcPath, tacoModules, buildType, destPath);
            }).catch(function(err: any): any {
                console.error("Error packaging: " + err);
                throw err;
            });
    }

    private static updateInternalDependencies(srcPath: string, tacoModules: string[], buildType: string, destPath?: string): Q.Promise<any> {
        return GulpUtils.streamToPromise(gulp.src(path.join(srcPath, "/*/package.json"))
            .pipe(jsonEditor(
                function(json: IPackageJson): IPackageJson {
                    // update the version
                    json.version = GulpPackageUtils.transformPackageVersion(json.version, buildType);
                    Object.keys(json.dependencies || {}).forEach(function(packageKey: string): void {
                        if (tacoModules.indexOf(packageKey) >= 0) {
                            json.dependencies[packageKey] = GulpPackageUtils.getDependencyValue(packageKey, srcPath, buildType, destPath);
                        }
                    });
                    Object.keys(json.optionalDependencies || {}).forEach(function(packageKey: string): void {
                        if (tacoModules.indexOf(packageKey) >= 0) {
                            json.optionalDependencies[packageKey] = GulpPackageUtils.getDependencyValue(packageKey, srcPath, buildType, destPath);
                        }
                    });
                    Object.keys(json.devDependencies || {}).forEach(function(packageKey: string): void {
                        if (tacoModules.indexOf(packageKey) >= 0) {
                            json.devDependencies[packageKey] = GulpPackageUtils.getDependencyValue(packageKey, srcPath, buildType, destPath);
                        }
                    });
                    return json;
                }))
            .pipe(gulp.dest(srcPath)));
    }

    private static updateDynamicDependencies(srcPath: string, buildType: string, destPath: string): Q.Promise<any> {
        return GulpUtils.streamToPromise(gulp.src(path.join(srcPath, "/*/dynamicDependencies.json"))
            .pipe(jsonEditor(
                function(json: IDynamicDependenicesJson): IDynamicDependenicesJson {
                    Object.keys(json).forEach(function(packageKey: string): void {
                        var entry: IDynamicDependencyEntry = json[packageKey];
                        if (entry.dev) {
                            switch (buildType) {
                                case "dev":
                                    entry.localPath = util.format("file://%s.tgz", path.resolve(destPath || srcPath, entry.packageName));
                                    break;
                                case "beta":
                                    // If this package is taking "latest" and we are building a beta package,
                                    // then update the dependency to point to the beta version of the package
                                    var packageJson: IPackageJson = GulpPackageUtils.getPackageJson(srcPath, entry.packageName);
                                    entry.packageId = entry.packageName + "@" + GulpPackageUtils.transformPackageVersion(packageJson.version, buildType);
                                // intentional pass through, no "break;"
                                case "release":
                                    delete entry.dev;
                                    delete entry.localPath;
                                    break;
                                default:
                                    throw new Error(util.format("Unsupported build type '%s' requested", buildType));
                            }
                        }
                    });

                    return json;
                }
            ))
            .pipe(gulp.dest(srcPath)));
    }

    private static packageModules(srcPath: string, modules: string[], buildType: string, destPath: string): Q.Promise<any> {
        var resolvedModules = modules.map(function(tacoModule: string): string {
            return path.resolve(srcPath, tacoModule);
        });

        var deferred = Q.defer();
        var npmCmd = os.platform() === "win32" ? "npm.cmd" : "npm";
        var npmproc = child_process.spawn(npmCmd, ["pack"].concat(resolvedModules), { cwd: srcPath, stdio: "ignore" });
        npmproc.on("error", function(err: any): void {
            console.info("NPM pack error: " + err);
            deferred.reject(err);
        });
        npmproc.on("exit", function(code: number): void {
            if (code) {
                console.info("NPM pack exited non-zero " + code);
                deferred.reject(code);
            } else {
                deferred.resolve({});
            }
        });

        return deferred.promise.then(function(): void {
            modules.forEach(function(tacoModule: string): void {
                var packagejson: IPackageJson = GulpPackageUtils.getPackageJson(srcPath, tacoModule);
                var version = packagejson.version;
                var packed = path.resolve(srcPath, tacoModule + "-" + version + ".tgz");
                if (fs.existsSync(packed)) {

                    var targetPath: string = "";
                    if (buildType != "dev") {
                        targetPath = path.resolve(srcPath, buildType, tacoModule + ".tgz");
                    } else {
                        targetPath = path.resolve(srcPath, tacoModule + ".tgz");
                    }
                    var parentDir = path.dirname(targetPath);
                    if (!fs.existsSync(parentDir)) {
                        fs.mkdirSync(parentDir);
                    }
                    GulpUtils.streamToPromise(fs.createReadStream(packed).pipe(fs.createWriteStream(targetPath)))
                        .then(function(): void {
                            fs.unlinkSync(packed);
                        });
                }
            });
        }).catch(function(err: any): any {
            console.info("ERROR: " + err);
            throw err;
        });
    }

    private static getDependencyValue(dependencyName: string, srcPath: string, buildType: string, destPath: string): string {
        switch (buildType) {

            case "dev":
                var uncPathPadding = destPath.indexOf("\\\\") === 0 ? "\\\\" : "";
                return util.format("file:%s%s.tgz", uncPathPadding, path.resolve(destPath || srcPath, dependencyName));

            case "beta":
            case "release":
                // strip out "file:" prefix, Load package.json for the dependency and read it's version
                var packageJson: IPackageJson = GulpPackageUtils.getPackageJson(srcPath, dependencyName);
                return "^" + GulpPackageUtils.transformPackageVersion(packageJson.version, buildType);

            default:
                throw new Error(util.format("Unsupported build type '%s' requested", buildType));
        }
    }

    private static transformPackageVersion(version: string, buildType: string) {

        var bareVersion: string = version.split("-")[0];
        switch (buildType) {
            case "release":
                return bareVersion;
            case "dev":
            case "beta":
                return util.format("%s-%s", bareVersion, buildType);
            default:
                throw new Error(util.format("Unsupported build type '%s' requested", buildType));
        }
    }

    private static getPackageJson(srcPath: string, packageName: string): IPackageJson {
        var jsonPath = path.resolve(srcPath, packageName, "package.json");
        return <IPackageJson>JSON.parse(fs.readFileSync(jsonPath, ""));
    }
}
export = GulpPackageUtils;
