/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

// Extremely minimal type definition for archiver package

declare module Archiver {
    // TODO improve typings for better intellisense
    function archiver(format: string, options?: any): any;
}

declare module "archiver" {
    import archiverFunc = Archiver.archiver;
    export = archiverFunc;
}
