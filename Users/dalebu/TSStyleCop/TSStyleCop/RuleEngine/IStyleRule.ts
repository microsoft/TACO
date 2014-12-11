
/// <reference path="RuleContext.ts" />
/// <reference path="Utils.ts" />

module TSStyleCop {
    export interface IStyleRule<T> {
        code: string;
        name: string;
        filter?: TypeScript.SyntaxKind[];
        checkElement(element: T, context: RuleContext, position?: number): void;
    }
}