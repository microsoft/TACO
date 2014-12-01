// Barebones typing for zip-stream, added as-needed

declare module "zip-stream" {
    class ZipStream {
        constructor(options?: any);

        entry(source, data, callback: Function): void;

        on(event: string, listener: Function): ZipStream;
        pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean; }): T;

        finalize(): void;
    }
    export = ZipStream;
}