var x = undefined;

(function (undefined?: any): void {
})();

class NoUnqotedUndefined {
    public testMethod(a: string = undefined): void {
        var b = undefined;

        if (b === undefined) {
        }

        var tested = b !== undefined ? true : false;

        if (typeof b === "undefined") {
            return;
        }
    }
}