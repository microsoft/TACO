// Type definitions for winreg https://www.npmjs.com/package/winreg
	
declare class Winreg {
	constructor(options: Winreg.WinregOptions);
	host: string;
	hive: string;
	key: string;
	path: string;
	parent: Winreg;

	public get(name: string, callback: Winreg.WinregCallback<Winreg.WinregValue>): void;
}

declare module Winreg {
	export interface WinregOptions {
		host?: string;
		hive: Hive;
		key: string;
	}

	export enum Hive {
		HKLM,
		HKCU,
		HKCR,
		HKCC,
		HKU
	}

	export interface WinregValue {
		host: string;
		hive: string;
		key: string;
		name: string;
		type: string;
		value: string;
	}

	export interface WinregCallback<T> {
		(err: NodeJS.ErrnoException, val: T): void;
	}

	export var HKLM: Hive;
	export var HKCU: Hive;
	export var HKCR: Hive;
	export var HKCC: Hive;
	export var HKU: Hive;
}

declare module "winreg" {
	export = Winreg;	
}
