/// <reference path="../src/typings/node.d.ts" />
/// <reference path="../src/typings/Q.d.ts" />
/// <reference path="../src/typings/tar.d.ts" />
/// <reference path="../src/typings/fstream.d.ts" />
/// <reference path="../src/typings/del.d.ts" />

import child_process = require("child_process");
import del = require("del");
import fs = require("fs");
import fstream = require("fstream");
import gulp = require("gulp");
import os = require("os");
import path = require("path");
import Q = require("q");
import tar = require("tar");
import util = require("util");
import zlib = require("zlib");

class GulpUtil {

    public static runAllTests(modulesToTest: string[], modulesRoot: string): Q.Promise<any> {
        return modulesToTest.reduce(function (soFar: Q.Promise<any>, val: string): Q.Promise<any> {
            return soFar.then(function (): Q.Promise<any> {
                var modulePath = path.resolve(modulesRoot, val);
                return GulpUtil.installModule(modulePath)
                    .then(function (): Q.Promise<any> {

                    var npmCommand = "npm" + (os.platform() === "win32" ? ".cmd" : "");
                    var testProcess = child_process.spawn(npmCommand, ["test"], { cwd: modulePath, stdio: "inherit" });
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
            });
        }, Q({}))
    }

    public static installModules(modulesToInstall: string[], modulesRoot: string): Q.Promise<any> {
        return modulesToInstall.reduce(function (soFar: Q.Promise<any>, val: string): Q.Promise<any> {
            return soFar.then(function (): Q.Promise<any> {
                return GulpUtil.installModule(path.resolve(modulesRoot, val));
            });
        }, Q({}))
    }

    public static copyFiles(pathsToCopy: string[], srcPath: string, destPath: string): Q.Promise<any> {
        return Q.all(pathsToCopy.map(function (val: string): Q.Promise<any> {
            return GulpUtil.streamToPromise(gulp.src(path.join(srcPath, val)).pipe(gulp.dest(destPath)));
        }));
    }

    public static deleteDirectoryRecursive(dirPath: string, callback: (err: Error, deletedFiles: string[]) => any) {
        console.warn(util.format("Deleting %s", dirPath));
        del([dirPath + "/**"], { force: true }, callback);
    }

    public static prepareTemplates(templatesSrc: string, templatesDest: string): Q.Promise<any> {
        var buildTemplatesPath: string = path.resolve(templatesDest);
        var pipes: NodeJS.WritableStream[] = [];

        if (!fs.existsSync(buildTemplatesPath)) {
            fs.mkdirSync(buildTemplatesPath);
        }

        // Read the templates dir to discover the different kits
        var kits: string[] = GulpUtil.getChildDirectoriesSync(templatesSrc);

        kits.forEach(function (value: string, index: number, array: string[]): void {
            // Read the kit's dir for all the available templates
            var kitSrcPath: string = path.join(templatesSrc, value);
            var kitTargetPath: string = path.join(buildTemplatesPath, value);

            if (!fs.existsSync(kitTargetPath)) {
                fs.mkdirSync(kitTargetPath);
            }

            var kitTemplates: string[] = GulpUtil.getChildDirectoriesSync(kitSrcPath);

            kitTemplates.forEach(function (value: string, index: number, array: string[]): void {
                var templateSrcPath: string = path.resolve(kitSrcPath, value);
                var templateTargetPath: string = path.join(kitTargetPath, value + ".tar.gz");
                var dirReader: fstream.Reader = new fstream.Reader({ path: templateSrcPath, type: "Directory", mode: 777 });

                var pipe: NodeJS.WritableStream = dirReader.pipe(tar.Pack()).pipe(zlib.createGzip()).pipe(new fstream.Writer({ path: templateTargetPath }));
                pipes.push(pipe);
            });
        });
        return Q.all(pipes.map(GulpUtil.streamToPromise));
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

export = GulpUtil;