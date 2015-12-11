/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */
/// <reference path="../src/typings/node.d.ts" />
/// <reference path="../src/typings/Q.d.ts" />
/// <reference path="../src/typings/del.d.ts" />
/// <reference path="../src/typings/archiver.d.ts" />
/// <reference path="../src/typings/gulp.d.ts" />

import archiver = require ("archiver");
import child_process = require ("child_process");
import del = require ("del");
import fs = require ("fs");
import gulp = require("gulp");
import os = require ("os");
import path = require ("path");
import Q = require ("q");

class GulpUtils {
    private static testCommand: string = "test";

    public static runAllTests(modulesToTest: string[], modulesRoot: string, failTestsAtEnd: boolean, reporter: string): Q.Promise<any> {
        var args: string[] = [];
        if (reporter) {
            args = ["--reporter", reporter];
        }
      return GulpUtils.runNpmScript(modulesToTest, modulesRoot, GulpUtils.testCommand, failTestsAtEnd, args);
    }

    public static linkPackages(modulesToLink: string[], modulesRoot: string): Q.Promise<any> {
        return GulpUtils.chainAsync<string>(modulesToLink, (moduleName: string) => {
            return GulpUtils.runNpmCommand("link", [], path.resolve(modulesRoot, moduleName));
        });
    }

    public static runNpmScript(modulesToTest: string[], modulesRoot: string, scriptName: string, failAtEnd: boolean, args: string[]): Q.Promise<any> {
        var failures: string[] = [];
        return GulpUtils.chainAsync<string>(modulesToTest, (moduleName: string) => {

            var modulePath = path.resolve(modulesRoot, moduleName);
            // check if package has any tests
            var pkg = require(path.join(modulePath, "package.json"));
            if (!pkg.scripts || !(scriptName in pkg.scripts)) {
                return Q({});
            }

            var commandArgs = [scriptName];
            if (args && args.length > 0) {
                commandArgs.push("--");
                commandArgs = commandArgs.concat(args);
            }

            return GulpUtils.runNpmCommand("run-script", commandArgs, modulePath)
                .catch(() => {
                    if (failAtEnd) {
                        failures.push(moduleName);
                        return Q.resolve({});
                    } else {
                        return Q.reject("Test failed for " + modulePath);
                    }
                });
        }).then(function(): Q.Promise<any> {
            if (failures.length > 0) {
                return Q.reject("Tests Failed for " + failures.join(", "));
            }
            return Q.resolve({});
        });
    }

    public static installModules(modulesToInstall: string[], modulesRoot: string): Q.Promise<any> {
        return GulpUtils.chainAsync<string>(modulesToInstall, (moduleName: string) => {
            return GulpUtils.installModule(path.resolve(modulesRoot, moduleName));
        });
    }

    public static uninstallModules(modulesToUninstall: string[], installRoot: string): Q.Promise<any> {
        return GulpUtils.chainAsync<string>(modulesToUninstall, (moduleName: string) => {
            return GulpUtils.uninstallModule(moduleName, installRoot);
        });
    }

    public static copyFiles(pathsToCopy: string[], destPath: string): Q.Promise<any> {
        return GulpUtils.streamToPromise(gulp.src(pathsToCopy).pipe(gulp.dest(destPath)));
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

            kitTemplates.forEach(function(templateValue: string): void {
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

    public static chainAsync<T>(values: T[], func: (value: T) => Q.Promise<any>): Q.Promise<any> {
        return values.reduce(function(soFar: Q.Promise<any>, val: T): Q.Promise<any> {
            return soFar.then(function(): Q.Promise<any> {
                return func(val);
            });
        }, Q({}));
    }

    public static mkdirp(dir: string): void {
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

    private static runNpmCommand(command: string, commandArgs: string[], cwd?: string): Q.Promise<any> {
        var deferred = Q.defer();
        var npmCommand = "npm" + (os.platform() === "win32" ? ".cmd" : "");
        commandArgs.unshift(command);
        child_process.spawn(npmCommand, commandArgs, { cwd: cwd, stdio: "inherit" })
            .on("close", function(code: number): void {
                if (code) {
                    deferred.reject("npm command " + command + "failed");
                } else {
                    deferred.resolve({});
                }
            });
        return deferred.promise;
    }
}
export = GulpUtils;
