/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="./node.d.ts" />
declare module "iconv-lite" {

    export function decode(b: Buffer, encoding: string): string;
}