/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

// Barebones typing for unorm, added as-needed

interface Object {
    normalize: (form?: string) => string;
}

declare module "unorm" {
    export function nfc(str: string): string;
    export function nfd(str: string): string;
    export function nfkc(str: string): string;
    export function nfkd(str: string): string;
}
