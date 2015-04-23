
declare module TacoUtility {
    class ResourceManagerBase {

        protected get ResourcesDir(): Boolean;

        /** ...optionalArgs is only there for typings, function rest params */
        public getString(id: string, ...optionalArgs: any[]): string;
    }
}
