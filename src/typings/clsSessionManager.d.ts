
declare module TacoUtility {
    export class ClsSessionManager {

        public static runInTacoSession(sessionVariables: { [key: string]: any; }, func: Function): void;
        public static getCurrentTacoSessionVariable(key: string): any;
    }
}
