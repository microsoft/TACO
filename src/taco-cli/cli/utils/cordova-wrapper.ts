import child_process = require ("child_process");
import Q = require ("q");

class CordovaWrapper {
    public static cli(args: string[]): Q.Promise<any> {
        var deferred = Q.defer();
        var proc = child_process.exec(["cordova"].concat(args).join(" "), function (err: Error, stdout: Buffer, stderr: Buffer): void {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve({ stdout: stdout, stderr: stderr });
            }
        });
        return deferred.promise;
    }

    public static build(platform: string): Q.Promise<any> {
        return CordovaWrapper.cli(["build", platform]);
    }

    public static create(path: string, id?: string, name?: string, cdvConfig?: string, cfg?: any): Q.Promise<any> {
        var command: string[] = ["create", path];

        if (id) {
            command.push(id);
        }

        if (name) {
            command.push(name);
        }

        if (cdvConfig) {
            command.push(cdvConfig);
        }

        // Options
        for (var option in cfg) {
            command.push("--" + option);

            // If the property has a value that isn't boolean, also include its value in the command
            if (cfg[option] && typeof cfg[option] !== "Boolean") {
                command.push(cfg[option]);
            }
        }

        return CordovaWrapper.cli(command);
    }
}

export = CordovaWrapper;