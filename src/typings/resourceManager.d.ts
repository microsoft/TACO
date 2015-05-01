
declare module TacoUtility {
    class ResourceManager {
        private Resources;
        private SupportedLanguages;
        private static DefaultLanguage;

        constructor(resourcesDir: string, language: string);
        /** ...optionalArgs is only there for typings, function rest params */
        getString(id: string, ...optionalArgs: any[]): string;
        /** ** ...optionalArgs is only there for typings, function rest params** */
        getStringForLanguage(requestOrAcceptLangs: any, id: string, ...optionalArgs: any[]): string;
        private bestLanguageMatchOrDefault(requestOrAcceptLangs);
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
        private bestLanguageMatch(requestOrAcceptLangs);
        /**
         * Given a list of languages, we try to find an exact match if we can, and we fall back to a primary language otherwise.
         *  e.g. "fr-CA" will use "fr-CA" resources if present, but will fall back to "fr" resources if they are available
         */
        private getBestLanguageFromArray(acceptLangs);
        private static loadLanguage(language, resourcesDir);
    }
}
