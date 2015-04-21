/// <reference path="../src/typings/node.d.ts" />
/// <reference path="../src/typings/Q.d.ts" />
/// <reference path="../src/typings/tar.d.ts" />
/// <reference path="../src/typings/fstream.d.ts" />
/// <reference path="../src/typings/del.d.ts" />
/// <reference path="../src/typings/archiver.d.ts" />

import archiver = require ("archiver");
import child_process = require ("child_process");
import del = require ("del");
import fs = require ("fs");
import fstream = require ("fstream");
import gulp = require ("gulp");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import util = require ("util");
import zlib = require ("zlib")

class GulpUtils {

    private static testCommand: string = "test";

    public static runAllTests(modulesToTest: string[], modulesRoot: string): Q.Promise<any> {
        return modulesToTest.reduce(function (soFar: Q.Promise<any>, val: string): Q.Promise<any> {
            return soFar.then(function (): Q.Promise<any> {

                var modulePath = path.resolve(modulesRoot, val);
                // check if package has any tests
                var pkg = require(path.join(modulePath, "package.json"));
                if (pkg.scripts.indexOf(GulpUtils.testCommand) == -1) {
                    return Q({});
                }

                var npmCommand = "npm" + (os.platform() === "win32" ? ".cmd" : "");
                var testProcess = child_process.spawn(npmCommand, [GulpUtils.testCommand], { cwd: modulePath, stdio: "inherit" });
                var deferred = Q.defer();
                testProcess.on("close", function (code: number): void {
                    if (code) {
                        deferred.reject("Test failed for " + modulePath);
                    } else {
                        deferred.resolve({});
                    }
                });
                return deferred.promise;
            });
        }, Q({}))
    }

    public static installModules(modulesToInstall: string[], modulesRoot: string): Q.Promise<any> {
        return modulesToInstall.reduce(function (soFar: Q.Promise<any>, val: string): Q.Promise<any> {
            return soFar.then(function (): Q.Promise<any> {
                return GulpUtils.installModule(path.resolve(modulesRoot, val));
            });
        }, Q({}))
    }

    public static copyFiles(pathsToCopy: string[], srcPath: string, destPath: string): Q.Promise<any> {
        return Q.all(pathsToCopy.map(function (val: string): Q.Promise<any> {
            return GulpUtils.streamToPromise(gulp.src(path.join(srcPath, val)).pipe(gulp.dest(destPath)));
        }));
    }

    public static deleteDirectoryRecursive(dirPath: string, callback: (err: Error, deletedFiles: string[]) => any) {
        console.warn(util.format("Deleting %s", dirPath));
        del([dirPath + "/**"], { force: true }, callback);
    }

    public static prepareTemplates(templatesSrc: string, templatesDest: string): Q.Promise<any> {
        var buildTemplatesPath: string = path.resolve(templatesDest);
        var promises: Q.Promise<any>[] = [];

        if (!fs.existsSync(buildTemplatesPath)) {
            fs.mkdirSync(buildTemplatesPath);
        }

        // Read the templates dir to discover the different kits
        var templatesPath: string = templatesSrc;
        var kits: string[] = GulpUtils.getChildDirectoriesSync(templatesPath);

        kits.forEach(function (kitValue: string, index: number, array: string[]): void {
            // Read the kit's dir for all the available templates
            var kitSrcPath: string = path.join(templatesSrc, kitValue);
            var kitTargetPath: string = path.join(buildTemplatesPath, kitValue);

            if (!fs.existsSync(kitTargetPath)) {
                fs.mkdirSync(kitTargetPath);
            }

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
                archive.bulk({ expand: true, cwd: path.join(templatesPath, kitValue), src: [templateValue + "/**"] }).finalize();
                promises.push(deferred.promise);
            });
        });

        return Q.all(promises);
    }

    private static installModule(modulePath: string): Q.Promise<any> {
        console.log("Installing " + modulePath);
        var deferred = Q.defer<Buffer>();
        child_process.exec("npm install", { cwd: modulePath }, deferred.makeNodeResolver());
        return deferred.promise;
    }

    private static streamToPromise(stream: NodeJS.ReadWriteStream|NodeJS.WritableStream): Q.Promise<any> {
        var deferred = Q.defer();
        stream.on("finish", function (): void {
            deferred.resolve({});
        });
        stream.on("error", function (e: Error): void {
            deferred.reject(e);
        });
        return deferred.promise;
    }

    private static getChildDirectoriesSync(dir: string): string[]{
        return fs.readdirSync(dir).filter(function (entry: string): boolean {
            return fs.statSync(path.resolve(dir, entry)).isDirectory();
        });
    }
}

export = GulpUtils;