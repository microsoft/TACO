/// <reference path="../typings/resources-manager.d.ts" />
/// <reference path="../typings/build-info.d.ts" />
/// <reference path="../typings/cordova-config.d.ts" />
/// <reference path="../typings/util-helper.d.ts" />
/// <reference path="../typings/logger.d.ts" />
/// <reference path="../typings/commands.d.ts" />
/// <reference path="../typings/process-logger.d.ts" />
/// <reference path="../typings/taco-package-loader.d.ts" />
/// <reference path="../typings/template-helper.d.ts" />

// To add more classes, make sure that they define themselves in the TacoUtility namespace,
// include a reference to the d.ts file that is generated (as above), and make sure
// to remove the "export =" and any imports in the file. If it refers to external types,
// ensure that it has a /// <reference> to the relevant file, and that it uses the same name
// that file does for the type's namespace. See util-helper for how it uses Q

declare module "taco-utils" {
    export = TacoUtility;
}
