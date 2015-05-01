/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/tacoUtils.d.ts" />
/// <reference path="../typings/express.d.ts" />
/// <reference path="../typings/semver.d.ts" />
/// <reference path="../typings/remotebuild.d.ts" />

declare module TacoRemoteLib {
    interface IRequestRedirector {
        getPackageToServeRequest(buildInfo: TacoUtility.BuildInfo, req: Express.Request): Q.Promise<TacoRemoteLib.IRemoteLib>;
    }
    interface IReadOnlyConf {
        get(prop: string): any;
    }
    interface IRemoteLib {
        /**
         * The module exposes the localization resources so that the server can localize buildInfo regardless of where the string tokens come from.
         */
        locResources: TacoUtility.ResourceManager;
        /**
         * Initialize this package so it is ready to service requests
         *
         * @param {IReadOnlyConf} config Configuration parameters that originate from the command line and config files
         */
        init(config: IReadOnlyConf): void;
        /**
         * Download a packaged app ready to be deployed to a device
         *
         * @param {BuildInfo} buildInfo Information specifying the build
         * @param {Express.Request} req The HTTP request being serviced
         * @param {Express.Response} res The response to the HTTP request, which must be sent by this function
         * @param {Function} callback A callback indicating whether any errors occurred so the build manager can keep track
         */
        downloadBuild(buildInfo: TacoUtility.BuildInfo, req: Express.Request, res: Express.Response, callback: (err: any) => void): void;
        /**
         * Launch an app in a simulator or emulator
         *
         * @param {BuildInfo} buildInfo Information specifying the build
         * @param {Express.Request} req The HTTP request being serviced
         * @param {Express.Response} res The response to the HTTP request, which must be sent by this function
         */
        emulateBuild(buildInfo: TacoUtility.BuildInfo, req: Express.Request, res: Express.Response): void;
        /**
         * Deploy an app to a device attached to the build server
         *
         * @param {BuildInfo} buildInfo Information specifying the build
         * @param {Express.Request} req The HTTP request being serviced
         * @param {Express.Response} res The response to the HTTP request, which must be sent by this function
         */
        deployBuild(buildInfo: TacoUtility.BuildInfo, req: Express.Request, res: Express.Response): void;
        /**
         * Launch an app on a device attached to the build server
         *
         * @param {BuildInfo} buildInfo Information specifying the build
         * @param {Express.Request} req The HTTP request being serviced
         * @param {Express.Response} res The response to the HTTP request, which must be sent by this function
         */
        runBuild(buildInfo: TacoUtility.BuildInfo, req: Express.Request, res: Express.Response): void;
        /**
         * Enable debugging for the specified build
         *
         * @param {BuildInfo} buildInfo Information specifying the build
         * @param {Express.Request} req The HTTP request being serviced
         * @param {Express.Response} res The response to the HTTP request, which must be sent by this function
         */
        debugBuild(buildInfo: TacoUtility.BuildInfo, req: Express.Request, res: Express.Response): void;
        /**
         * Validate whether the request appears to be a valid build request
         *
         * @param {Express.Request} request The HTTP request being serviced
         * @param {string[]} errors A list of errors to append to that explain why this is not a valid request
         * @returns {boolean} True if the request is valid, false otherwise
         */
        validateBuildRequest(request: Express.Request, errors: string[]): boolean;
        /**
         * Build the specified app
         *
         * @param {BuildInfo} buildInfo Information specifying the build
         * @param {Function} callback A callback to pass back the successful or failed build
         */
        build(buildInfo: TacoUtility.BuildInfo, callback: (resultBuildInfo: TacoUtility.BuildInfo) => void): void;
    }
    /**
     * Initialize this package so it is ready to service requests
     *
     * @param {IReadOnlyConf} config Configuration parameters that originate from the command line and config files
     */
    function init(config: IReadOnlyConf): void;
    /**
     * Download a packaged app ready to be deployed to a device
     *
     * @param {BuildInfo} buildInfo Information specifying the build
     * @param {Express.Request} req The HTTP request being serviced
     * @param {Express.Response} res The response to the HTTP request, which must be sent by this function
     * @param {Function} callback A callback indicating whether any errors occurred so the build manager can keep track
     */
    function downloadBuild(buildInfo: TacoUtility.BuildInfo, req: Express.Request, res: Express.Response, callback: (err: any) => void): void;
    /**
     * Launch an app in a simulator or emulator
     *
     * @param {BuildInfo} buildInfo Information specifying the build
     * @param {Express.Request} req The HTTP request being serviced
     * @param {Express.Response} res The response to the HTTP request, which must be sent by this function
     */
    function emulateBuild(buildInfo: TacoUtility.BuildInfo, req: Express.Request, res: Express.Response): void;
    /**
     * Deploy an app to a device attached to the build server
     *
     * @param {BuildInfo} buildInfo Information specifying the build
     * @param {Express.Request} req The HTTP request being serviced
     * @param {Express.Response} res The response to the HTTP request, which must be sent by this function
     */
    function deployBuild(buildInfo: TacoUtility.BuildInfo, req: Express.Request, res: Express.Response): void;
    /**
     * Launch an app on a device attached to the build server
     *
     * @param {BuildInfo} buildInfo Information specifying the build
     * @param {Express.Request} req The HTTP request being serviced
     * @param {Express.Response} res The response to the HTTP request, which must be sent by this function
     */
    function runBuild(buildInfo: TacoUtility.BuildInfo, req: Express.Request, res: Express.Response): void;
    /**
     * Enable debugging for the specified build
     *
     * @param {BuildInfo} buildInfo Information specifying the build
     * @param {Express.Request} req The HTTP request being serviced
     * @param {Express.Response} res The response to the HTTP request, which must be sent by this function
     */
    function debugBuild(buildInfo: TacoUtility.BuildInfo, req: Express.Request, res: Express.Response): void;
    /**
     * Validate whether the request appears to be a valid build request
     *
     * @param {Express.Request} request The HTTP request being serviced
     * @param {string[]} errors A list of errors to append to that explain why this is not a valid request
     * @returns {boolean} True if the request is valid, false otherwise
     */
    function validateBuildRequest(request: Express.Request, errors: string[]): boolean;
    /**
     * Build the specified app
     *
     * @param {BuildInfo} buildInfo Information specifying the build
     * @param {Function} callback A callback to pass back the successful or failed build
     */
    function build(buildInfo: TacoUtility.BuildInfo, callback: (resultBuildInfo: TacoUtility.BuildInfo) => void): void;
}
declare module "taco-remote-lib" {
    export = TacoRemoteLib;
}