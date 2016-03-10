// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

interface IRemoteServerSequence {
    expectedUrl: string;
    statusCode: number;
    head: any;
    response: any;
    waitForPayload?: boolean;
    responseDelay?: number;
    fileToSend?: string;
};

export = IRemoteServerSequence;
