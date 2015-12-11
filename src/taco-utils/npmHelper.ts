/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/npm.d.ts" />
/// <reference path="../typings/q.d.ts" />

"use strict";

import npm = require("npm");
import path = require("path");
import Q = require("q");
import nopt = require("nopt");
import url = require("url");
import semver = require("semver");

import installLogLevel = require("./installLogLevel");
import InstallLogLevel = installLogLevel.InstallLogLevel;

module TacoUtility {
	export class NpmHelper {
		private static runNpmCommand(npmCommand: string, args: string[], workingDirectory: string, commandFlags?: string[], logLevel?: InstallLogLevel, optionalArgs?: any): Q.Promise<any> {
			var conf: any = {};
			if (commandFlags) {
				conf = nopt(NpmDefaults.types, NpmDefaults.shorthands, commandFlags, 0);
			}
			
			if (logLevel && logLevel > 0) {
				conf["logLevel"] = InstallLogLevel[logLevel];
			}
			
			var propertiesToSet: string[] = Object.keys(conf);
			if (propertiesToSet.indexOf("argv") !== -1) {
				propertiesToSet.splice(propertiesToSet.indexOf("argv"), 1);
			}
			
			var oldValues: any = {};
			return Q.nfcall(npm.load, {}).then(function() {
				for (var i: number = 0; i < propertiesToSet.length; i++) {
					// Record current value
					oldValues[propertiesToSet[i]] = Object.keys(npm.config.list[0]).indexOf(propertiesToSet[i]) === -1 ? undefined : npm.config.list[0][propertiesToSet[i]];
					// Set new value from config object
					npm.config.list[0][propertiesToSet[i]] = conf[propertiesToSet[i]];
				}

				npm.prefix = workingDirectory || ".";

				if (optionalArgs !== undefined) {
					return Q.ninvoke(npm.commands, npmCommand, args, optionalArgs);
				}
				else {
					return Q.ninvoke(npm.commands, npmCommand, args);
				}
			})
			.finally(function(){
				for (var i: number = 0; i < propertiesToSet.length; i++) {
					// Restore previous value
					npm.config.list[0][propertiesToSet[i]] = oldValues[propertiesToSet[i]];

					// Delete property if previous value was undefined
					if (npm.config.list[0][propertiesToSet[i]] === undefined) {
						delete npm.config.list[0][propertiesToSet[i]];
					}
				}
			});
		}
		
		public static install(packageId: string, workingDirectory?: string, commandFlags?: string[], logLevel?: InstallLogLevel): Q.Promise<any> {
			return NpmHelper.runNpmCommand("install", [packageId], workingDirectory, commandFlags, logLevel);
		}
		
		public static view(packageId: string, fields?: string[], workingDirectory?: string, commandFlags?: string[], logLevel?: InstallLogLevel): Q.Promise<any> {
			var args = [packageId].concat(fields);
			return NpmHelper.runNpmCommand("view", args, workingDirectory, commandFlags, logLevel, /*silent=*/true);
		}
	}
	export class NpmDefaults {
		public static types:any = {
			access: [null, 'restricted', 'public'],
			'always-auth': Boolean,
			also: [null, 'dev', 'development'],
			'bin-links': Boolean,
			browser: [null, String],
			ca: [null, String, Array],
			cafile: path,
			cache: path,
			'cache-lock-stale': Number,
			'cache-lock-retries': Number,
			'cache-lock-wait': Number,
			'cache-max': Number,
			'cache-min': Number,
			cert: [null, String],
			color: ['always', Boolean],
			depth: Number,
			description: Boolean,
			dev: Boolean,
			'dry-run': Boolean,
			editor: String,
			'engine-strict': Boolean,
			force: Boolean,
			'fetch-retries': Number,
			'fetch-retry-factor': Number,
			'fetch-retry-mintimeout': Number,
			'fetch-retry-maxtimeout': Number,
			git: String,
			'git-tag-version': Boolean,
			global: Boolean,
			globalconfig: path,
			'global-style': Boolean,
			group: [Number, String],
			'https-proxy': [null, url],
			'user-agent': String,
			'heading': String,
			'if-present': Boolean,
			'ignore-scripts': Boolean,
			'init-module': path,
			'init-author-name': String,
			'init-author-email': String,
			'init-author-url': ['', url],
			'init-license': String,
			'init-version': semver,
			json: Boolean,
			key: [null, String],
			'legacy-bundling': Boolean,
			link: Boolean,
			// local-address must be listed as an IP for a local network interface
			// must be IPv4 due to node bug
			/*'local-address': getLocalAddresses(),*/
			loglevel: ['silent', 'error', 'warn', 'http', 'info', 'verbose', 'silly'],
			/*logstream: stream.Stream,*/
			long: Boolean,
			message: String,
			'node-version': [null, semver],
			npat: Boolean,
			'onload-script': [null, String],
			only: [null, 'dev', 'development', 'prod', 'production'],
			optional: Boolean,
			parseable: Boolean,
			prefix: path,
			production: Boolean,
			progress: Boolean,
			'proprietary-attribs': Boolean,
			proxy: [null, false, url], // allow proxy to be disabled explicitly
			'rebuild-bundle': Boolean,
			registry: [null, url],
			rollback: Boolean,
			save: Boolean,
			'save-bundle': Boolean,
			'save-dev': Boolean,
			'save-exact': Boolean,
			'save-optional': Boolean,
			'save-prefix': String,
			scope: String,
			searchopts: String,
			searchexclude: [null, String],
			searchsort: [
				'name', '-name',
				'description', '-description',
				'author', '-author',
				'date', '-date',
				'keywords', '-keywords'
			],
			shell: String,
			shrinkwrap: Boolean,
			'sign-git-tag': Boolean,
			'strict-ssl': Boolean,
			tag: String,
			tmp: path,
			unicode: Boolean,
			'unsafe-perm': Boolean,
			usage: Boolean,
			user: [Number, String],
			userconfig: path,
			/*umask: Umask,*/
			version: Boolean,
			'tag-version-prefix': String,
			versions: Boolean,
			viewer: String,
			_exit: Boolean
		};
				
		public static shorthands:any = {
			s: ['--loglevel', 'silent'],
			d: ['--loglevel', 'info'],
			dd: ['--loglevel', 'verbose'],
			ddd: ['--loglevel', 'silly'],
			noreg: ['--no-registry'],
			N: ['--no-registry'],
			reg: ['--registry'],
			'no-reg': ['--no-registry'],
			silent: ['--loglevel', 'silent'],
			verbose: ['--loglevel', 'verbose'],
			quiet: ['--loglevel', 'warn'],
			q: ['--loglevel', 'warn'],
			h: ['--usage'],
			H: ['--usage'],
			'?': ['--usage'],
			help: ['--usage'],
			v: ['--version'],
			f: ['--force'],
			gangster: ['--force'],
			gangsta: ['--force'],
			desc: ['--description'],
			'no-desc': ['--no-description'],
			'local': ['--no-global'],
			l: ['--long'],
			m: ['--message'],
			p: ['--parseable'],
			porcelain: ['--parseable'],
			g: ['--global'],
			S: ['--save'],
			D: ['--save-dev'],
			E: ['--save-exact'],
			O: ['--save-optional'],
			y: ['--yes'],
			n: ['--no-yes'],
			B: ['--save-bundle'],
			C: ['--prefix']
		};
	}
}

export = TacoUtility;
