// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/// <reference path="../../../typings/node.d.ts" />

interface IHttpServerFunction {
    (request: NodeJSHttp.ServerRequest, response: NodeJSHttp.ServerResponse): void;
};

export = IHttpServerFunction;
