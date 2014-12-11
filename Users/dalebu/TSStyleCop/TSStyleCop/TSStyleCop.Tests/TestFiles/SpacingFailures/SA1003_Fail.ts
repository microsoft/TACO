var a = 1&2;
var b = 1* 2;
var c = ! b;
var d = a ===b;
var e =()=>true;
var array = [1, 3, 5];
class Summation {
    public numbers: number[ ];
    public getNumbers (): number [] {
        return this.numbers;
    }

    public summation (numbers: number[]): number {
        var result = 0;
        for (var i = 0; i < numbers.length; i++) {
            result += this.numbers [ i ];
        }

        return result;
    }

    public add(): number {
        var numbers: number[ ] = this.getNumbers();
        return this.summation (numbers);
    }
}

class Dictionary < K, V > {
    private _enabledRules: { [code: string]: boolean; };
    private _emptyLiteral = {};
    private _emptyArray = [];

    constructor() { }
}

var dict = new Dictionary < number, string >();

class Score<Game, Points> {
    constructor() { }
}

var entry = new Score<Baseball, Runs>();

var x = [1, 2, 3 ];

var foo = (<foo> <any>bar);

var y = [
    1,
    2,
    3
];

var lifecycleData = <Graph.MarkData[]>[];

export interface IWebWorkers {
    [index: number]: IWebWorker;
}