/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="./express.d.ts" />

declare module Helmet {
    interface IHelmetSettings {
        maxAge?: number;
        includeSubdomains?: boolean;
        force?: boolean;
    }

    function hsts(settings: IHelmetSettings): Express.RequestHandler;
}

declare module "helmet" {
    export = Helmet;
}