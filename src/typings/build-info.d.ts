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
        static createNewBuildInfoFromDataObject(buildInfoData: any): BuildInfo;
        updateStatus(status: string, messageId?: string, ...messageArgs: any[]): void;
        localize(req: any): BuildInfo;
    }
}