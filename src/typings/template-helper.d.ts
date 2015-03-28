/// <reference path="../typings/adm-zip.d.ts" />
/// <reference path="../typings/wrench.d.ts" />
/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/Q.d.ts" />

declare module TacoUtility {
    interface ITemplateMetaData {
        [kitName: string]: {
            [templateName: string]: {
                name: string;
                url: string;
            };
        };
    }

    interface ITemplateCacheInfo {
        name: string;
        kitName: string;
        url: string;
    }

    class TemplateHelper {
        /**
         * Provides the path of the specified template in taco-home's template cache. If the specified template is not in the cache, then
         * the template is fetched and cached before its path is returned.
         *
         * @param {string} The name of the desired template
         *
         * @return {Q.Promise<string>} A Q promise that is resolved with the template's cached path if there are no errors, or rejected with the error's string ID
         */
        public static getCachedTemplatePath(templateName: string): Q.Promise<string>;

        /**
         * Copies remaining template items from the specified cached template location to the specified project folder. Once everything is copied, replace the
         * template's tokens in the project files with their actual values
         *
         * @param {string} The name of the desired template
         * @param {string} The name of the desired template
         * @param {[token: string]: string} A dictionary of tokens to replace in the project files and their value
         *
         * @return {Q.Promise<any>} An empty promise
         */
        public static finalizeTemplateInstallation(projectPath: string, cachedTemplatePath: string, tokens: { [token: string]: string }): Q.Promise<any>;

        private static acquireTemplatesMetaData(): Q.Promise<ITemplateMetaData>;

        private static extractTemplateCacheInfo(templateName: string, templateMetaData: ITemplateMetaData): Q.Promise<ITemplateCacheInfo>;

        private static ensureTemplateInCache(templateCacheInfo: ITemplateCacheInfo): Q.Promise<string>;
    }
}