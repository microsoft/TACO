/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

// Barebones typing for fstream, added as-needed

declare module Fstream {
    export interface IReaderProps {
        path: string;
    }
    export interface IProps {
        mtime: Date;
        type: string;
        path: string;
        mode?: number;
        depth?: number;
        Directory?: boolean;
    }
    export class Reader extends Abstract {
        constructor(props: IReaderProps, currentStat?: any);
        constructor(props: string, currentStat?: any);

        pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean; }): T;

        parent: Reader;
        path: string;
        type: string;
        depth: number;
        root: Reader;
        basename: string;
        dirname: string;
        props: IProps;
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

        props: IProps;
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

declare module "fstream" {
    export = Fstream;
}