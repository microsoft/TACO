// Barebones typing for fstream, added as-needed

declare module "fstream" {
    export class ReaderProps {
        path: string
    }
    export class Reader {
        constructor(props: ReaderProps, currentStat?);
        constructor(props: string, currentStat?);

        pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean; }): T;

        parent: Reader;
        path: string;
        type: string;
        depth: number;
        root: Reader;
        basename: string;
        dirname: string;
    }

    export class Writer {

    }

    export class Abstract {

    }
}
