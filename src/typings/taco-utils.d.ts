/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/elementtree.d.ts" />
/// <reference path="../typings/unorm.d.ts" />
declare module TacoUtility {
    class ResourcesManager {
        private static Resources;
        private static SupportedLanguages;
        private static DefaultLanguage;
        static init(language: string, resourcesDir?: string): void;
        static teardown(): void;
        /** ...optionalArgs is only there for typings, function rest params */
        static getString(id: string, ...optionalArgs: any[]): string;
        /** ** ...optionalArgs is only there for typings, function rest params** */
        static getStringForLanguage(requestOrAcceptLangs: any, id: string, ...optionalArgs: any[]): string;
        private static bestLanguageMatchOrDefault(requestOrAcceptLangs);
        /**
         * requestOrAcceptLangs can either be:
         * A string, with format "LangSpec[,LangSpec]*" where LangSpec is "Language[;anything]"
         *   e.g. "pl,fr-FR;q=0.3,en-US;q=0.1" is interpreted as "pl" or "fr-FR" or "en-US". Currently we ignore provided quality (q) values
         * An array, which we assume is an array of strings representing languages such as "pl" or "fr-FR"
         * A (express-style) HTTP Request object, with a headers property specifing "accept-language" in a string, as above
         *
         * This allows us to handle simple cases of a single string, as well as more complex cases where a client specifies
         * multiple preferences.
         */
        private static bestLanguageMatch(requestOrAcceptLangs);
        /**
         * Given a list of languages, we try to find an exact match if we can, and we fall back to a primary language otherwise.
         *  e.g. "fr-CA" will use "fr-CA" resources if present, but will fall back to "fr" resources if they are available
         */
        private static getBestLanguageFromArray(acceptLangs);
        private static loadLanguage(language, resourcesDir);
        private static getOptionalArgsArrayFromFunctionCall(functionArguments, startFrom);
    }
    class CordovaConfig {
        /** CordovaConfig is a class for parsing the config.xml file for Cordova projects */
        private _doc;
        constructor(configXmlPath: string);
        id(): string;
        name(): string;
        version(): string;
        preferences(): {
            [key: string]: string;
        };
    }
    class UtilHelper {
        private static InvalidAppNameChars;
        /** Converts an untyped argument into a boolean in a "sensible" way, treating only the string "true" as true rather than any non-empty string * */
        static argToBool(input: any): boolean;
        static readFileContentsSync(filename: string, encoding?: string): string;
        static getOptionalArgsArrayFromFunctionCall(functionArguments: IArguments, startFrom: number): any[];
    }
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
declare module "taco-utils"{
export = TacoUtility;
}
