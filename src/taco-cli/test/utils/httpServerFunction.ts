/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../../../typings/node.d.ts" />

interface IHttpServerFunction {
    (request: NodeJSHttp.ServerRequest, response: NodeJSHttp.ServerResponse): void;
};

export = IHttpServerFunction;
