/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

// Barebones typing for opener, added as-needed
// NPM Package page: https://www.npmjs.com/package/opener
// License: WTFPL - https://github.com/domenic/opener/blob/master/LICENSE.txt
// Source code: https://github.com/domenic/opener


declare module Opener {
    export function opener(url: string): void;
}

declare module "opener" {
    export = Opener.opener;
}