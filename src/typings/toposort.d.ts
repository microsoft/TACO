/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

declare module toposort {
    export function array<T>(nodes: T[], edges: T[][]): T[];
}

declare function toposort<T>(graph: T[][]): T[];

declare module "toposort" {
    export = toposort;
}