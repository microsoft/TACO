/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />

interface INameDescription {
    name: string;
    description: string;
}

interface ICommandDescription extends INameDescription {
    options?: INameDescription[];
}

interface ICommandAlias {
    alias: string;
    command: string;
}