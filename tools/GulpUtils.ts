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

    public static package(srcPath: string, tacoModules: string[], buildType: string, destPath: string): Q.Promise<any> {

        return Q.all([
            GulpUtils.updateInternalDependencies(srcPath, tacoModules, buildType, destPath),
            GulpUtils.updateDynamicDependencies(srcPath, buildType, destPath)
        ])
            .then(function(): Q.Promise<any> {
                // npm pack each folder, put the tgz in the parent folder
                return GulpUtils.packageModules(srcPath, tacoModules, buildType, destPath);
            }).catch(function(err: any): any {
                console.error("Error packaging: " + err);
                throw err;
            });
    }

    public static deleteDirectoryRecursive(dirPath: string): Q.Promise<any> {
        return Q.denodeify(del)(dirPath, { force: true });
    }

    public static prepareTemplates(templatesSrc: string, templatesDest: string): Q.Promise<any> {
        var buildTemplatesPath: string = path.resolve(templatesDest);
        var promises: Q.Promise<any>[] = [];

        GulpUtils.mkdirp(buildTemplatesPath);

        // Read the templates dir to discover the different kits
        var templatesPath: string = templatesSrc;
        var kits: string[] = GulpUtils.getChildDirectoriesSync(templatesPath);

        kits.forEach(function(kitValue: string, index: number, array: string[]): void {
            // Read the kit's dir for all the available templates
            var kitSrcPath: string = path.join(templatesSrc, kitValue);
            var kitTargetPath: string = path.join(buildTemplatesPath, kitValue);

            GulpUtils.mkdirp(kitTargetPath);

            var kitTemplates: string[] = GulpUtils.getChildDirectoriesSync(kitSrcPath);

            kitTemplates.forEach(function(templateValue: string, index: number, array: string[]): void {
                // Create the template's archive
                var templateSrcPath: string = path.resolve(kitSrcPath, templateValue);
                var templateTargetPath: string = path.join(kitTargetPath, templateValue + ".zip");
                var archive: any = archiver("zip");
                var outputStream: NodeJS.WritableStream = fs.createWriteStream(templateTargetPath);
                var deferred: Q.Deferred<any> = Q.defer<any>();

                archive.on("error", function(err: Error): void {
                    deferred.reject(err);
                });

                outputStream.on("close", function(): void {
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

    public static streamToPromise(stream: NodeJS.ReadWriteStream | NodeJS.WritableStream): Q.Promise<any> {
        var deferred = Q.defer();
        stream.on("finish", function(): void {
            deferred.resolve({});
        });
        stream.on("end", function(): void {
            deferred.resolve({});
        });
        stream.on("error", function(e: Error): void {
            deferred.reject(e);
        });
        return deferred.promise;
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
        return fs.readdirSync(dir).filter(function(entry: string): boolean {
            return fs.statSync(path.resolve(dir, entry)).isDirectory();
        });
    }

    private static mkdirp(dir: string): void {
        var folders = dir.split(path.sep);
        var start = folders.shift();
        folders.reduce(function(soFar: string, currentFolder: string): string {
            var folder = path.join(soFar, currentFolder);
            if (!fs.existsSync(folder)) {
                fs.mkdirSync(folder);
            }
            return folder;
        }, start + path.sep);
    }

    private static updateInternalDependencies(srcPath: string, tacoModules: string[], buildType: string, destPath?: string): Q.Promise<any> {
        return GulpUtils.streamToPromise(gulp.src(path.join(srcPath, "/*/package.json"))
            .pipe(jsonEditor(
                function(json: IPackageJson): IPackageJson {
                    // update the version
                    json.version = GulpUtils.transformPackageVersion(json.version, buildType);
                    Object.keys(json.dependencies || {}).forEach(function(packageKey: string): void {
                        if (tacoModules.indexOf(packageKey) >= 0) {
                            json.dependencies[packageKey] = GulpUtils.getDependencyValue(packageKey, srcPath, buildType, destPath);
                        }
                    });
                    Object.keys(json.optionalDependencies || {}).forEach(function(packageKey: string): void {
                        if (tacoModules.indexOf(packageKey) >= 0) {
                            json.optionalDependencies[packageKey] = GulpUtils.getDependencyValue(packageKey, srcPath, buildType, destPath);
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
                                    entry.localPath = util.format("file://%s.tgz", path.resolve(destPath || srcPath, packageKey));
                                    break;
                                case "beta":
                                    // If this package is taking "latest" and we are building a beta package,
                                    // then update the dependency to point to the beta version of the package
                                    if (entry.expirationIntervalInHours) {
                                        var packageJson: IPackageJson = GulpUtils.getPackageJson(srcPath, entry.packageName);
                                        entry.packageId = entry.packageName + "@" + GulpUtils.transformPackageVersion(packageJson.version, buildType);
                                    }
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
                var packagejson: IPackageJson = GulpUtils.getPackageJson(srcPath, tacoModule);
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
                var packageJson: IPackageJson = GulpUtils.getPackageJson(srcPath, dependencyName);
                return "^" + GulpUtils.transformPackageVersion(packageJson.version, buildType);

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

export = GulpUtils;
