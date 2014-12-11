
module TSStyleCop {
    export interface IScriptHostAPI {
        log(message: string, code: string, filename: string, startLine: number, startCharacter: number, endLine: number, endCharacter: number): void;
        warning(message: string, code: string, filename: string, startLine: number, startCharacter: number, endLine: number, endCharacter: number): void;
        error(message: string, code: string, filename: string, startLine: number, startCharacter: number, endLine: number, endCharacter: number): void;
    }
}