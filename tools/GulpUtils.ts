/// <reference path="../src/typings/dynamicDependencyEntry.d.ts" />
/// <reference path="../src/typings/node.d.ts" />
/// <reference path="../src/typings/Q.d.ts" />
/// <reference path="../src/typings/tar.d.ts" />
/// <reference path="../src/typings/fstream.d.ts" />
/// <reference path="../src/typings/del.d.ts" />
/// <reference path="../src/typings/archiver.d.ts" />
/// <reference path="../src/typings/gulp.d.ts" />
/// <reference path="../src/typings/gulp-json-editor.d.ts" />

import archiver = require ("archiver");
import child_process = require ("child_process");
import del = require ("del");
import fs = require ("fs");
import fstream = require ("fstream");
import gulp = require ("gulp");
import jsonEditor = require ("gulp-json-editor");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import util = require ("util");
import zlib = require("zlib");

interface IPackageJson {
    version: string;
    dependencies: { [key: string]: string };
    optionalDependencies: { [key: string]: string };
}

interface IDynamicDependenicesJson {
    [packageKey: string]: IDynamicDependencyEntry;
}

class GulpUtils {
    private static TestCommand: string = "test";

    public static runAllTests(modulesToTest: string[], modulesRoot: string): Q.Promise<any> {
        return modulesToTest.reduce(function(soFar: Q.Promise<any>, val: string): Q.Promise<any> {
            return soFar.then(function(): Q.Promise<any> {

                var modulePath = path.resolve(modulesRoot, val);
                // check if package has any tests
                var pkg = require(path.join(modulePath, "package.json"));
                if (!pkg.scripts || !(GulpUtils.TestCommand in pkg.scripts)) {
                    return Q({});
                }

                var npmCommand = "npm" + (os.platform() === "win32" ? ".cmd" : "");
                var testProcess = child_process.spawn(npmCommand, [GulpUtils.TestCommand], { cwd: modulePath, stdio: "inherit" });
                var deferred = Q.defer();
                testProcess.on("close", function(code: number): void {
                    if (code) {
                        deferred.reject("Test failed for " + modulePath);
                    } else {
                        deferred.resolve({});
                    }
                });
                return deferred.promise;
            });
        }, Q({}));
    }

    public static installModules(modulesToInstall: string[], modulesRoot: string): Q.Promise<any> {
        return modulesToInstall.reduce(function(soFar: Q.Promise<any>, val: string): Q.Promise<any> {
            return soFar.then(function(): Q.Promise<any> {
                return GulpUtils.installModule(path.resolve(modulesRoot, val));
            });
        }, Q({}));
    }

    public static uninstallModules(modulesToUninstall: string[], installRoot: string): Q.Promise<any> {
        return modulesToUninstall.reduce(function(soFar: Q.Promise<any>, val: string): Q.Promise<any> {
            return soFar.then(function(): Q.Promise<any> {
                return GulpUtils.uninstallModule(val, installRoot);
            });
        }, Q({}));
    }

    public static copyFiles(pathsToCopy: string[], destPath: string): Q.Promise<any> {
        return GulpUtils.streamToPromise(gulp.src(pathsToCopy).pipe(gulp.dest(destPath)));
    }

    public static prepareDevPackages(destPath: string, dropLocation: string, packed: boolean = false): Q.Promise<any> {

        var uncPathPadding = dropLocation.indexOf("\\\\") === 0 ? "\\\\" : "";

        return GulpUtils.preparePackages(destPath,
            function(json: IPackageJson): IPackageJson {
                return GulpUtils.updateInternalDependencies(json, function (packageKey: string, value: string) : string {
                    return util.format("file:%s%s", uncPathPadding, path.resolve(dropLocation, packageKey + ".tgz"));
                });
            },
            function(json: IDynamicDependenicesJson): IDynamicDependenicesJson {
                Object.keys(json).forEach(function(packageKey: string): void {
                    var entry: IDynamicDependencyEntry = json[packageKey];
                    if (entry.dev) {
                        entry.localPath = util.format("file://%s%s", path.resolve(dropLocation || destPath, entry.packageName), packed ? ".tgz" : "");
                    }
                });
                return json;
            });
    }

    public static preparePublishPackages(destPath: string, suffix: string): Q.Promise<any> {
        return GulpUtils.preparePackages(destPath,
            function(json: IPackageJson): IPackageJson {
                json.version = GulpUtils.getPublishVersion(json.version, suffix);
                return GulpUtils.updateInternalDependencies(json, function (packageKey: string, value: string): string {
                    // strip out "file:" prefix, Load package.json for the dependency and read it's version
                    var packageJson: IPackageJson = GulpUtils.getPackageJson(destPath, packageKey);
                    return "^" + GulpUtils.getPublishVersion(packageJson.version, suffix);
                });
            },
            function(json: IDynamicDependenicesJson): IDynamicDependenicesJson {
                Object.keys(json).forEach(function(packageKey: string): void {
                    var entry: IDynamicDependencyEntry = json[packageKey];
                    entry.dev = undefined;
                    entry.localPath = undefined;
                    var packageJson: IPackageJson = GulpUtils.getPackageJson(destPath, entry.packageName);
                    entry.packageId = packageKey + "@" + GulpUtils.getPublishVersion(packageJson.version, suffix);
                });
                return json;
            });
    }

    public static copyDynamicDependenciesJson(fileGlob: string, srcPath: string, destPath: string, dropLocation: string, packed: boolean = false): Q.Promise<any> {
        return GulpUtils.streamToPromise(gulp.src(path.join(srcPath, fileGlob))
            .pipe(jsonEditor(
                function (json: IDynamicDependenicesJson): IDynamicDependenicesJson {
                    Object.keys(json).forEach(function (packageKey: string): void {
                        var entry: IDynamicDependencyEntry = json[packageKey];
                        if (entry.dev) {
                            entry.localPath = util.format("file://%s%s", path.resolve(dropLocation || destPath, entry.packageName), packed ? ".tgz" : "");
                        }
                    });
                    return json;
                }
                ))
            .pipe(gulp.dest(destPath)));
    }

    public static updateLocalPackageFilePaths(fileGlob: string, srcPath: string, destPath: string, dropLocation: string): Q.Promise<any> {
        var uncPathPadding = dropLocation.indexOf("\\\\") === 0 ? "\\\\" : "";
        return GulpUtils.streamToPromise(gulp.src(path.join(srcPath, fileGlob))
            .pipe(jsonEditor(
                function (json: IPackageJson): any {
                    GulpUtils.updateInternalDependencies(json, function(packageKey: string, value: string): string {
                        return util.format("file:%s%s", uncPathPadding, path.resolve(dropLocation, packageKey + ".tgz"));
                    });

                    return json;
                }))
            .pipe(gulp.dest(destPath)));

    }

    public static packageModules(srcPath: string, modules: string[], destPath: string, suffix?: string): Q.Promise<any> {
        var deferred = Q.defer();
        var resolvedModules = modules.map(function (tacoModule: string): string { return path.resolve(srcPath, tacoModule); });
        var npmproc = child_process.spawn(os.platform() === "win32" ? "npm.cmd" : "npm", ["pack"].concat(resolvedModules), { cwd: destPath, stdio: "inherit" });
        npmproc.on("error", function (err: any): void {
            console.info("NPM pack error: " + err);
            deferred.reject(err);
        });
        npmproc.on("exit", function (code: number): void {
            if (code) {
                console.info("NPM pack exited non-zero " + code);
                deferred.reject(code);
            } else {
                deferred.resolve({});
            }
        });

        return deferred.promise.then(function (): void {
            modules.forEach(function (tacoModule: string): void {
                var packagejson = require(path.resolve(srcPath, tacoModule, "package.json"));
                var version = packagejson.version;
                var packed = path.resolve(destPath, tacoModule + "-" + version + ".tgz");
                var suffix: string = suffix ? "-" + suffix : "";
                var bare = path.resolve(destPath, tacoModule + suffix + ".tgz");
                if (fs.existsSync(packed)) {
                    fs.renameSync(packed, bare);
                }
            });
        }).catch(function (err: any): any {
                console.info("ERROR: " + err);
                throw err;
            });

    }

    public static deleteDirectoryRecursive(dirPath: string, callback: (err: Error, deletedFiles: string[]) => any) {
        console.warn(util.format("Deleting %s", dirPath));
        del([dirPath + "/**"], { force: true }, callback);
    }

    public static prepareTemplates(templatesSrc: string, templatesDest: string): Q.Promise<any> {
        var buildTemplatesPath: string = path.resolve(templatesDest);
        var promises: Q.Promise<any>[] = [];

        GulpUtils.mkdirp(buildTemplatesPath);

        // Read the templates dir to discover the different kits
        var templatesPath: string = templatesSrc;
        var kits: string[] = GulpUtils.getChildDirectoriesSync(templatesPath);

        kits.forEach(function (kitValue: string, index: number, array: string[]): void {
            // Read the kit's dir for all the available templates
            var kitSrcPath: string = path.join(templatesSrc, kitValue);
            var kitTargetPath: string = path.join(buildTemplatesPath, kitValue);

            GulpUtils.mkdirp(kitTargetPath);

            var kitTemplates: string[] = GulpUtils.getChildDirectoriesSync(kitSrcPath);

            kitTemplates.forEach(function (templateValue: string, index: number, array: string[]): void {
                // Create the template's archive
                var templateSrcPath: string = path.resolve(kitSrcPath, templateValue);
                var templateTargetPath: string = path.join(kitTargetPath, templateValue + ".zip");
                var archive: any = archiver("zip");
                var outputStream: NodeJS.WritableStream = fs.createWriteStream(templateTargetPath);
                var deferred: Q.Deferred<any> = Q.defer<any>();

                archive.on("error", function (err: Error): void {
                    deferred.reject(err);
                });

                outputStream.on("close", function (): void {
                    deferred.resolve({});
                });

                archive.pipe(outputStream);

                // Note: archiver.bulk() automatically ignores files starting with "."; if this behavior ever changes, or if a different package is used
                // to archive the templates, some logic to exclude the ".taco-ignore" files found in the templates will need to be added here
                archive.bulk({ expand: true, cwd: path.join(templatesPath, kitValue, templateValue), src: ["**"] }).finalize();
                promises.push(deferred.promise);
            });
        });

        return Q.all(promises);
    }

    public static streamToPromise(stream: NodeJS.ReadWriteStream|NodeJS.WritableStream): Q.Promise<any> {
        var deferred = Q.defer();
        stream.on("finish", function (): void {
            deferred.resolve({});
        });
        stream.on("end", function (): void {
            deferred.resolve({});
        });
        stream.on("error", function (e: Error): void {
            deferred.reject(e);
        });
        return deferred.promise;
    }

    private static preparePackages(destPath: string,
                                  preparePackageJson: (json: IPackageJson) => IPackageJson,
                                  prepareDynamicDependencies: (json: IDynamicDependenicesJson) => IDynamicDependenicesJson): Q.Promise<any> {

        return Q.all([
            GulpUtils.streamToPromise(gulp.src(path.join(destPath, "/**/package.json"))
                .pipe(jsonEditor(
                    function(json: IPackageJson): any {
                        return preparePackageJson(json);
                    }))
                .pipe(gulp.dest(destPath))),

            GulpUtils.streamToPromise(gulp.src(path.join(destPath, "/**/dynamicDependencies.json"))
                .pipe(jsonEditor(
                    function(json: IDynamicDependenicesJson): IDynamicDependenicesJson {
                        return prepareDynamicDependencies(json);
                    }
                ))
                .pipe(gulp.dest(destPath)))
        ]);
    }

    private static installModule(modulePath: string): Q.Promise<any> {
        console.log("Installing " + modulePath);
        var deferred = Q.defer<Buffer>();
        child_process.exec("npm install", { cwd: modulePath }, deferred.makeNodeResolver());
        return deferred.promise;
    }

    private static uninstallModule(moduleName: string, installDir: string): Q.Promise<any> {
        if (!fs.existsSync(path.join(installDir, moduleName, "package.json"))) {
            return Q({});
        }

        // move one level up so that we run npm install from build\packages\
        installDir = path.join(installDir, "..");

        console.log("Uninstalling " + moduleName);
        var deferred = Q.defer<Buffer>();
        child_process.exec("npm uninstall " + moduleName, { cwd: installDir }, deferred.makeNodeResolver());
        return deferred.promise;
    }

    private static getChildDirectoriesSync(dir: string): string[] {
        return fs.readdirSync(dir).filter(function (entry: string): boolean {
            return fs.statSync(path.resolve(dir, entry)).isDirectory();
        });
    }

    private static mkdirp(dir: string): void {
        var folders = dir.split(path.sep);
        var start = folders.shift();
        folders.reduce(function (soFar: string, currentFolder: string): string {
            var folder = path.join(soFar, currentFolder);
            if (!fs.existsSync(folder)) {
                fs.mkdirSync(folder);
            }
            return folder;
        }, start + path.sep);
    }

    private static getPublishVersion(version: string, suffix: string) {
        suffix = suffix ? "-" + suffix : "";
        return version.replace("-dev", "") + suffix;
    }

    private static updateInternalDependencies(json: IPackageJson, func: (packageKey: string, value: string) => string): IPackageJson {
        Object.keys(json.dependencies || {}).forEach(function(packageKey: string): void {
            if (json.dependencies[packageKey].indexOf("file:") == 0) {
                json.dependencies[packageKey] = func(packageKey, json.dependencies[packageKey]);
            }
        });
        Object.keys(json.optionalDependencies || {}).forEach(function(packageKey: string): void {
            if (json.optionalDependencies[packageKey].indexOf("file:") == 0) {
                json.optionalDependencies[packageKey] = func(packageKey, json.optionalDependencies[packageKey]);
            }
        });

        return json;
    }

    private static getPackageJson(destPath: string, packageName: string): IPackageJson {
        return require(path.resolve(destPath, packageName, "package.json"));
    }
}

export = GulpUtils;
