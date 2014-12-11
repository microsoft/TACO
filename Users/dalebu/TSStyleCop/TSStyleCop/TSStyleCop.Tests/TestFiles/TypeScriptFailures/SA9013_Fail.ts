class Example {
    public c: number;

    constructor(private _a: string, public b: number) {
    }
}

class Example2 {
    private _a: string;

    public c: number;

    constructor(a: string, public b: number) {
        this._a = a;
    }
}

class Example3 {
    constructor(a: string, b: number) {
    }
}