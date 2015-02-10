declare module TacoUtility {
    class BuildInfo {
        status: string;
        /**
         * BuildInfo holds relevant information about a particular build, including its identifier, what kind of build was requested, and the status of the build
         * This information is passed around both within the remote build server, and back to the client
         */
        changeList: {
            deletedFiles: string[];
            changedFiles: string[];
            addedPlugins: string[];
            deletedPlugins: string[];
            deletedFilesIos: string[];
            changedFilesIos: string[];
            addedPluginsIos: string[];
            deletedPluginsIos: string[];
        };
        statusTime: Date;
        cordovaVersion: string;
        buildCommand: string;
        configuration: string;
        options: any;
        buildDir: string;
        buildLang: string;
        buildPlatform: string;
        submissionTime: Date;
        buildNumber: number;
        messageId: string;
        messageArgs: any[];
        message: string;
        tgzFilePath: string;
        appDir: string;
        appName: string;
        webDebugProxyPort: number;
        constructor(params: {
            buildNumber?: number;
            status?: string;
            cordovaVersion?: string;
            buildCommand?: string;
            configuration?: string;
            options?: any;
            buildDir?: string;
            buildLang?: string;
            buildPlatform?: string;
        });
        /**
         * Create a new BuildInfo object out of a raw JS object.
         *
         * @param {Object} buildInfoData An object to convert to a BuildInfo object
         *
         * @returns an instance of BuildInfo with the same keys and values as the input object
         */
        static createNewBuildInfoFromDataObject(buildInfoData: any): BuildInfo;
        /**
         * Set the status of the BuildInfo object, along with an optional message
         *
         * @param {string} status The status to set
         * @param {string} messageId Optional message identifier
         * @param {any[]} messageArgs Optional message arguments
         */
        updateStatus(status: string, messageId?: string, ...messageArgs: any[]): void;
        /**
         * Localize the message of the BuildInfo according to the specified language
         *
         * @param {string or express.Request} req The request or language to localize for
         *
         * @returns This object, after setting the message in the appropriate language.
         */
        localize(req: any): BuildInfo;
    }
}
