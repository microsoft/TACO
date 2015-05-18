/**
? *******************************************************
? *                                                     *
? *   Copyright (C) Microsoft. All rights reserved.     *
? *                                                     *
? *******************************************************
? */

declare module HashFiles {
    export interface IOptions {
        files?: string[];
        algorithm?: string;
        noGlob?: boolean;
        batchCount?: boolean;
    }

    export function sync(options: IOptions): string;
}

declare function HashFiles(options: HashFiles.IOptions, callback: (error: Error, hash: string) => void): void;

declare module "hash-files" {
    export = HashFiles;
}