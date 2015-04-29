
declare module TacoUtility {
    export class ClsSessionManager {

        public static RunInTacoSession(sessionVariables: { [key: string]: any; }, func: Function): void;
        public static GetCurrentTacoSessionVariable(key: string): any;
    }
}
