/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../typings/Q.d.ts" />

declare module TacoDependencyInstaller {
    class DependencyInstaller {
        constructor();

        /**
         * Runs the dependenciesInstaller package to install missing 3rd party software for the current project
         *
         * @param {string[]} Target platforms for which to install dependencies
         *
         * @return {Q.Promise<any>} A promise that is resolved if the dependencies install successfully, or rejected otherwise
         */
        public run(targetPlatforms: string[]): Q.Promise<any>;
    }
}

declare module "taco-dependency-installer" {
    export = TacoDependencyInstaller;
}