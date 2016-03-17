// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

declare module "idevice-app-launcher" {
	import * as child_process from "child_process";
	import * as net from "net";
	import * as Q from "q";
	class IosAppRunnerHelper {
		static startDebugProxy(proxyPort: number): Q.Promise<child_process.ChildProcess>;
		static startApp(packageId: string, proxyPort: number, appLaunchStepTimeout: number): Q.Promise<net.Socket>;
		static startAppViaDebugger(portNumber: number, packagePath: string, appLaunchStepTimeout: number): Q.Promise<net.Socket>;
		static encodePath(packagePath: string): string;
	}		

	export var raw: typeof IosAppRunnerHelper;
}