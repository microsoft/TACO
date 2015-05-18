/// <reference path="../typings/node.d.ts" />
"use strict";

module TacoKits {
    export enum TacoErrorCode {
        TacoKitsExceptionInvalidKit,
        TacoKitsExceptionInvalidTemplate,
        TacoKitsExceptionKitMetadataFileMalformed,
        TacoKitsExceptionKitMetadataFileNotFound,
        TacoKitsExceptionNoCliSpecification,
        TacoKitsExceptionTypescriptNotSupported
    }
}

export = TacoKits;
