/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

declare module gulp {
    interface Gulp {
        // Deprecated run interface that we use
        run(task: string): void;
    }
}
