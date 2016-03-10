// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/// <reference path="../typings/node.d.ts" />
"use strict";

module TacoKits {
    // Error Codes: 2000-2099
    export enum TacoErrorCode {
        TacoKitsExceptionInvalidKit = 2001,
        TacoKitsExceptionInvalidTemplate = 2002,
        TacoKitsExceptionKitMetadataFileMalformed = 2003,
        TacoKitsExceptionKitMetadataFileNotFound = 2004,
        TacoKitsExceptionNoCliSpecification = 2005,
        TacoKitsExceptionTypescriptNotSupported = 2006
    }
}

export = TacoKits;
