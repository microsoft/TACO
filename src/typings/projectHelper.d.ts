/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/Q.d.ts" />

declare module TacoUtility {

    class ProjectHelper {
        public static getProjectRoot(): string;
        public static cdToProjectRoot(): void;
        public static getProjectInfo(): Q.Promise<IProjectInfo>;

        public static editTacoJsonFile(editParams: ITacoJsonEditParams, cordovaCliVersion: string): Q.Promise<any>;

        /**
         *  public helper that returns all the installed components - platforms/plugins
         */
        public static getInstalledComponents(projectDir: string, componentDirName: string): Q.Promise<string[]>;

        /**
         *  public helper that gets the version of the installed platforms
         */
        public static getInstalledPlatformVersions(projectDir: string): Q.Promise<any>;
        /**
         *  public helper that gets the version of the installed plugins
         */
        public static getInstalledPluginVersions(projectDir: string): Q.Promise<any>;
        /**
         *  public helper that gets the list of plugins that are 1. installed from the local file system or a GIT repository 2. that are not top-level plugins
         */
        public static getNonUpdatablePlugins(projectDir: string): Q.Promise<string[]>;

        /**
         *  public helper that serializes the JSON blob {jsonData} passed to a file @ {tacoJsonPath}
         */
        public static createJsonFileWithContents(tacoJsonPath: string, jsonData: any): Q.Promise<any>;

        /**
         *  public helper that returns the common telemetry properties for the current project
         */
        public static getCurrentProjectTelemetryProperties(): Q.Promise<ICommandTelemetryProperties>;

        /**
         *  public helper that resolves with a true value if the current project is a TACO TS project
         */
        public static isTypeScriptProject(): boolean;
    }
}

