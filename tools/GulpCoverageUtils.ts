/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */
/// <reference path="../src/typings/node.d.ts" />
/// <reference path="../src/typings/Q.d.ts" />

import fs = require ("fs");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import util = require ("util");
import GulpUtils = require ("../tools/GulpUtils");

class GulpCoverageUtils {
    // this is our default report type
    // Valid values are: clover, cobertura, html, json-summary, json, file, lcovonly, teamcity, text-lcov, text-summary or text
    private static COVERAGE_REPORT_TYPE: string = "html";
    private static COVERAGE_COMMAND: string = "coverage";
    private static SECONDARY_COVERAGE_DIR: string = "secondary";

    public static runCoverage(modulesToTest: string[], modulesRoot: string, coverageOutputDir: string, secondaryCoverageDirs: string[]): Q.Promise<any> {
        coverageOutputDir = path.resolve(coverageOutputDir);
        modulesRoot = path.resolve(modulesRoot);

        return GulpUtils.runNpmScript(modulesToTest, modulesRoot, GulpCoverageUtils.COVERAGE_COMMAND, true /* failAtEnd */, [])
            .then(function(): Q.Promise<any> {
                return Q.all<any>(modulesToTest.map(moduleName => {
                    // this post coverage copy back is needed more for the scenario to support
                    // coverage reports from a different machine (say MACOS)
                    return GulpCoverageUtils.copyGeneratedCoverageJson(moduleName, modulesRoot, coverageOutputDir);
                }));
            })
            .then(function(): Q.Promise<any> {
                var coverageResults: string[] = [coverageOutputDir];
                if (secondaryCoverageDirs) {
                    coverageResults.concat(secondaryCoverageDirs);
                }
                return GulpCoverageUtils.mergeAndGenerateReports(coverageResults, coverageOutputDir, modulesRoot);
            }).then(function(): Q.Promise<any> {
                return GulpUtils.deleteDirectoryRecursive(path.resolve(coverageOutputDir, GulpCoverageUtils.SECONDARY_COVERAGE_DIR));
            });
    }

    private static mergeAndGenerateReports(coverageResultsPaths: string[], coverageOutputDir: string, modulesRoot: string): Q.Promise<any> {
        return GulpCoverageUtils.collectCoverageJsons(coverageResultsPaths)
            .then(function(coverageJsonsList: string[]): any {
                return GulpCoverageUtils.normalizeCoveragePaths(coverageJsonsList, coverageOutputDir, modulesRoot);
            })
            .then(function(coverageJsonsList: string[]): void {
                // collect all generated coverage.json and use them to remap to typescript sources
                var loadCoverage: any = require("remap-istanbul/lib/loadCoverage");
                var remap: any = require("remap-istanbul/lib/remap");
                var writeReport: any = require("remap-istanbul/lib/writeReport");

                var coverage = loadCoverage(coverageJsonsList);
                var collector = remap(coverage, { basePath: "./" });
                return writeReport(collector, GulpCoverageUtils.COVERAGE_REPORT_TYPE, coverageOutputDir);
            });
    }

    private static collectCoverageJsons(coverageResultsPaths: string[]): Q.Promise<string[]> {
        // read all the directories and prepare a flat list of coverageXXX.json we need to remap
        return Q.all<string[]>(coverageResultsPaths.map(coverageResultsPath => {
            coverageResultsPath = path.resolve(coverageResultsPath);
            return Q.denodeify(fs.readdir)(coverageResultsPath)
                .then(function(files: string[]): string[] {
                    return files.filter(file => {
                        return file.toLowerCase().indexOf("coverage-") === 0 && path.extname(file) === ".json";
                    }).map(file => path.join(coverageResultsPath, file));
                });
        })).then(function(coverageFiles: string[][]): string[] {
            return coverageFiles.reduce((coverageFilesList: string[], files: string[]) => {
                return coverageFilesList.concat(files);
            });
        });
    }

    private static normalizeCoveragePaths(coverageJsonsList: string[], coverageOutputDir: string, modulesRoot: string): Q.Promise<string[]> {
        var index: number = 0;
        return Q.all<string>(coverageJsonsList.map(coverageJsonPath => {

            // ignore if this coverage report belongs to current repository
            if (coverageJsonPath.indexOf(coverageOutputDir) === 0) {
                return Q.resolve(coverageJsonPath);
            }

            var remappedJson: any = GulpCoverageUtils.normalizePathsInCoverageJson(coverageJsonPath, modulesRoot);
            GulpUtils.mkdirp(path.resolve(coverageOutputDir, GulpCoverageUtils.SECONDARY_COVERAGE_DIR));
            var destPath = path.resolve(coverageOutputDir, GulpCoverageUtils.SECONDARY_COVERAGE_DIR, util.format("coverage%d.json", index++));
            return Q.denodeify(fs.writeFile)(destPath, JSON.stringify(remappedJson))
                .then(() => Q.resolve(destPath));
        }));
    }

    private static normalizePathsInCoverageJson(jsonPath: string, modulesRoot: string): any {
        var json = JSON.parse(fs.readFileSync(jsonPath, ""));
        var paths: string[] = Object.keys(json);
        paths.forEach(filepath => {
            // Remap all the paths from different machine looking at build/packages/node_modules
            var newPath: string = filepath.replace(/.*build\/packages\/node_modules/, modulesRoot);
            // normalize all slashes
            switch (os.platform()) {
                case "win32":
                    newPath = newPath.replace(/\//g, path.sep);
                    break;
                default:
                    newPath = newPath.replace(/\\/g, path.sep);
            }
            json[newPath] = json[filepath];
            json[newPath].path = newPath;
            delete json[filepath];
        });
        return json;
    }

    private static copyGeneratedCoverageJson(moduleName: string, modulesRoot: string, coverageOutputDir: string): Q.Promise<any> {
        // We don't specify coverage output path in package.json for 2 reasons
        // 1. It is wierd that running "npm run-script coverage" generates the output 2 level up in coverage folder
        // 2. we need to duplicate the hardcoding in every package.json
        var coverageJsonSrc = path.resolve(modulesRoot, moduleName, "coverage", "coverage.json");
        // if coverage.json doesn't exist, ignore
        if (!fs.existsSync(coverageJsonSrc)) {
            return Q({});
        }

        GulpUtils.mkdirp(coverageOutputDir);
        var coverageJsonDest = path.resolve(coverageOutputDir, util.format("coverage-%s.json", moduleName));
        return GulpUtils.streamToPromise(fs.createReadStream(coverageJsonSrc).pipe(fs.createWriteStream(coverageJsonDest)));
    }
}

export = GulpCoverageUtils;
