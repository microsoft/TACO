/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

import child_process = require("child_process");

class SharedState {
    public static get webProxyInstance(): child_process.ChildProcess {
        if (global.tacoRemoteLib) {
            return global.tacoRemoteLib.webProxyInstance;
        } else {
            return null;
        }
    }

    public static set webProxyInstance(proc: child_process.ChildProcess) {
        if (!global.tacoRemoteLib) {
            global.tacoRemoteLib = {};
        }

        global.tacoRemoteLib.webProxyInstance = proc;
    }

    public static get nativeDebuggerProxyInstance(): child_process.ChildProcess {
        if (global.tacoRemoteLib) {
            return global.tacoRemoteLib.nativeDebuggerProxyInstance;
        } else {
            return null;
        }
    }

    public static set nativeDebuggerProxyInstance(proc: child_process.ChildProcess) {
        if (!global.tacoRemoteLib) {
            global.tacoRemoteLib = {};
        }

        global.tacoRemoteLib.nativeDebuggerProxyInstance = proc;
    }
}

export = SharedState;