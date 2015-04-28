declare module ContinuationLocalStorage {

    function createNamespace(name: String): Session;
    function getNamespace(name: String): Session;

    interface Session {
        get(key: string): any;
        set(key: string, value: any): void;
        run(fn: Function): void;
   }
}

declare module "continuation-local-storage" {
    export = ContinuationLocalStorage;
}
