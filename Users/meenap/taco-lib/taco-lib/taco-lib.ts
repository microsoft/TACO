import cordova = require('cordova');
import util = require('./lib/util');
import createProject = require('./lib/create');
import buildProject = require('./lib/build');
import runProject = require('./lib/run');
import platformHelper = require('./lib/platform');


module taco{
    export function create(dir: string, id: string, name: string, cfg: string): Q.Promise<any> {
        return createProject.createProject(dir, id, name, cfg);
    }

    export function build(options: any): Q.Promise<any> {
        return buildProject.buildProject(options);
    }

    export function compile(options: any): Q.Promise<any> {
        return buildProject.buildProject(options);
    }

    export function prepare(options: any): Q.Promise<any> {
        return buildProject.buildProject(options);
    }

    export function platform(command: string, targets: string, options: any): Q.IPromise<any> {
        return platformHelper.platformCommand(command, targets, options);
    }

    export function run(options: any): Q.Promise<any> {
        return runProject.runProject(options);
    }

    export function emulate(options: any): Q.Promise<any> {
        return runProject.emulateProject(options);
    }
}
export = taco;