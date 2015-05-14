/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

// Barebones typing for fstream, added as-needed

declare module "fstream" {
    export class ReaderProps {
        path: string
    }
    export class Reader extends Abstract {
        constructor(props: ReaderProps, currentStat?: any);
        constructor(props: string, currentStat?: any);

        pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean; }): T;

        parent: Reader;
        path: string;
        type: string;
        depth: number;
        root: Reader;
        basename: string;
        dirname: string;
        props: {
            mtime: Date;
            type: string;
        }

    }

    export class Writer extends Abstract implements NodeJS.WritableStream {
        constructor(props: any);
        writable: boolean;
        write(buffer: Buffer, cb?: Function): boolean;
        write(str: string, cb?: Function): boolean;
        write(str: string, encoding?: string, cb?: Function): boolean;
        end(): void;
        end(buffer: Buffer, cb?: Function): void;
        end(str: string, cb?: Function): void;
        end(str: string, encoding?: string, cb?: Function): void;
    }

    export class Abstract implements NodeJS.EventEmitter {
        addListener(event: string, listener: Function): NodeJS.EventEmitter;
        on(event: string, listener: Function): NodeJS.EventEmitter;
        once(event: string, listener: Function): NodeJS.EventEmitter;
        removeListener(event: string, listener: Function): NodeJS.EventEmitter;
        removeAllListeners(event?: string): NodeJS.EventEmitter;
        setMaxListeners(n: number): void;
        listeners(event: string): Function[];
        emit(event: string, ...args: any[]): boolean;
    }
}
