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

    export class Writer extends Abstract {

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
