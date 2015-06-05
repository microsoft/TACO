// Type definitions for configstore 0.3.0
// Project: https://github.com/yeoman/configstore
// Definitions by: Bart van der Schoor <https://github.com/Bartvds>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

declare module 'configstore' {
    class Configstore {
        constructor(id: string, defaults?: Object);
	    /*
	     Set an item
	     */
	    set(key: string, val: any): void;

	    /*
	     Get an item
	     */
        get(key: string): any;

	    /*
	     Delete an item
	     */
        del(key: string): void;

	    /*
	     Get all items as an object or replace the current config with an object:

	     conf.all = {
	        hello: 'world'
	     };
	     */
        all: Object;

	    /*
	     Get the item count
	     */
        size: number;

	    /*
	     Get the path to the config file. Can be used to show the user where the config file is located or even better open it for them.
	     */
        path: string;
    }
    export = Configstore;
}