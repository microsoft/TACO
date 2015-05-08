/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

// Type definitions for replace

declare module Replace {
    interface IReplaceParameters {
        regex: any; // js regex or string
        replacement: string;
        paths: string[];
        recursive: boolean;
        silent: boolean;
    }

    function replace(parameters: IReplaceParameters): void;
}

declare module "replace" {
    import replace = Replace.replace;
    export = replace;
}
