/// <reference path='../../../typings/node/node.d.ts' />

import installerModule = require ("./hookInstaller");
var installer = new installerModule.CordovaTools.HookInstaller();
installer.installTypescriptHook(process.argv[2]);

