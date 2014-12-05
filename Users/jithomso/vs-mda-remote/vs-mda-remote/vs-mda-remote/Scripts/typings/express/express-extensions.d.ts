/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/

/// <reference path="express.d.ts"/>
/// <reference path="../node/node.d.ts"/>

declare module Express {
    export interface Application {
        (): (request: Request, response: Response) => void;
    }
}