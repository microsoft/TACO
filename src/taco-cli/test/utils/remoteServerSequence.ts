/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

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
