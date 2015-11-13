
declare module TacoUtility {
	enum TacoErrorLevel {
        Error,
        Warning
    }

    class TacoError implements Error {
        public errorCode: number;
        public message: string;
        public name: string;
        public errorLevel: TacoErrorLevel; 

        constructor(errorCode: number, message: string, category?: string, innerError?: Error);

        public static getError(errorToken: string, errorCode: number, resources: ResourceManager, ...optionalArgs: any[]): TacoError;
        public static getWarning(errorToken: string, resources: ResourceManager, ...optionalArgs: any[]): TacoError;
        public static wrapError(innerError: Error, errorToken: string, errorCode: number, resources: ResourceManager, ...optionalArgs: any[]): TacoError;
        public toString(): string;
    }
}
