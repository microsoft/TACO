/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../typings/node.d.ts" />
import os = require ("os");
import stream = require ("stream");

import Transform = stream.Transform;

module TacoUtility {
    /**
     * This class converts all newlines it encounters to either windows or unix style newlines, depending on the OS
     * Example usage:
     * var nns = new NewlineNormalizerStream();
     * readableStream.pipe(nns).pipe(writableStream);
     */
    export class NewlineNormalizerStream extends Transform {
        public _transform(chunk: any, encoding: string, callback: (err: Error, buf: string) => void): void {
            // Standardize all line endings first
            var scrubbedInput: string = chunk.toString().replace(/\r\n/g, "\n");
            // Then convert to the OS dependent newline
            var output: string = scrubbedInput.replace(/\n/g, os.EOL);

            callback(null, output);
        }
    }
}

export = TacoUtility;
