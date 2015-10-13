/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="./express.d.ts" />
/// <reference path="./node.d.ts" />
/// <reference path="./Q.d.ts" />

declare module Certs {
    interface ICertOptions {
        days?: number;
        cn?: string;
        country?: string;
        ca_cn: string;
        pfx_name: string;
        client_cn: string;
    }

    interface ICliHandler {
        question: (question: string, answerCallback: (answer: string) => void) => void;
        close: () => void;
    }

    interface ICertPaths {
        certsDir: string;
        caKeyPath: string;
        caCertPath: string;
        serverKeyPath: string;
        serverCertPath: string;
        newCerts: boolean;
    }

}

