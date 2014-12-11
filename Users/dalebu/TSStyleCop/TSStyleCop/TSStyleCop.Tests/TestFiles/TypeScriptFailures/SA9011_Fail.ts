// Interface
export interface IRecord {
    id: 
    number;
    first:string;
    last: string;
}

class Student {
    private _record:IRecord;

    public setRecord(id: number, firstName: string, lastName: string): void {
        this._record = {
            id:id,
            first: 

            firstName,
            last:
            lastName
        };
    }
}

var name = {first: "John", last: "Doe"};
var emptyLiteral = {};
