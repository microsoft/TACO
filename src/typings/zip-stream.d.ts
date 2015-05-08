/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

// Barebones typing for zip-stream, added as-needed

declare module "zip-stream" {
    class ZipStream {
        constructor(options?: any);

        entry(source: any, data: any, callback: Function): void;

        on(event: string, listener: Function): ZipStream;
        pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean; }): T;

        finalize(): void;
    }
    export = ZipStream;
}
