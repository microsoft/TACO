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
}

export = CordovaWrapper;