/// <reference path="../typings/tacoUtils.d.ts" />
/// <reference path="../typings/express.d.ts" />
/// <reference path="../typings/node.d.ts" />
import child_process = require ("child_process");
import utils = require ("taco-utils");
import BuildInfo = utils.BuildInfo;

interface ITargetPlatform {
    /**
     * Determine whether this class can service a particular build
     * 
     * @param {BuildInfo} buildInfo The build in question, including versions and arguments specified
     * @returns {boolean} Whether this class understands this kind of build, and should be used to service requests
     */
    canServiceRequest(buildInfo: BuildInfo): boolean;

    /**
     * Launch an app on a device attached to the build server
     * 
     * @param {BuildInfo} buildInfo Information specifying the build
     * @param {express.Request} req The HTTP request being serviced
     * @param {express.Response} res The response to the HTTP request, which must be sent by this function
     */
    runOnDevice(buildInfo: BuildInfo, req: Express.Request, res: Express.Response): void;

    /**
     * Download a packaged app ready to be deployed to a device
     * 
     * @param {BuildInfo} buildInfo Information specifying the build
     * @param {express.Request} req The HTTP request being serviced
     * @param {express.Response} res The response to the HTTP request, which must be sent by this function
     * @param {Function} callback A callback indicating whether any errors occurred so the build manager can keep track
     */
    downloadBuild(buildInfo: BuildInfo, req: Express.Request, res: Express.Response, callback: (err: any) => void): void;

    /**
     * Launch an app in a simulator or emulator
     * 
     * @param {BuildInfo} buildInfo Information specifying the build
     * @param {express.Request} req The HTTP request being serviced
     * @param {express.Response} res The response to the HTTP request, which must be sent by this function
     */
    emulateBuild(buildInfo: utils.BuildInfo, req: Express.Request, res: Express.Response): void;

    /**
     * Deploy an app to a device attached to the build server
     * 
     * @param {BuildInfo} buildInfo Information specifying the build
     * @param {express.Request} req The HTTP request being serviced
     * @param {express.Response} res The response to the HTTP request, which must be sent by this function
     */
    deployBuildToDevice(buildInfo: utils.BuildInfo, req: Express.Request, res: Express.Response): void;

    /**
     * Enable debugging for the specified build
     * 
     * @param {BuildInfo} buildInfo Information specifying the build
     * @param {express.Request} req The HTTP request being serviced
     * @param {express.Response} res The response to the HTTP request, which must be sent by this function
     */
    debugBuild(buildInfo: utils.BuildInfo, req: Express.Request, res: Express.Response): void;

    /**
     * Start a new node process ready to be sent a BuildInfo which will perform an actual build
     * 
     * @return {ChildProcess} the new node process that can be invoked with ".send({ buildInfo: buildInfo, language: language })" to perform a build
     */
    createBuildProcess(): child_process.ChildProcess;
}

export = ITargetPlatform;